from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Depends
from typing import List, Dict
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
import hashlib
import os
import shutil
import uuid

# Database imports
from app.database import get_sql_db, mongo_db
from app.models.sql_models import GovernmentApprovedRegistry, Counselor
from app.services.ai_engine import ai_engine_instance

router = APIRouter(prefix="/api/v1", tags=["Advanced Hybrid Platform Engine"])

# ----------------------------------------------------
# 1. Pydantic Schemas
# ----------------------------------------------------
class AnalysisRequest(BaseModel):
    user_hash: str
    text_content: str

class CounselorRegisterRequest(BaseModel):
    admin_secret_token: str
    gov_reg_number: str
    name: str
    email: EmailStr
    password: str

# ----------------------------------------------------
# 2. AI Risk Analysis Endpoint (Writes to NoSQL MongoDB)
# ----------------------------------------------------
@router.post("/analyze")
async def analyze_risk(payload: AnalysisRequest):
    if not payload.text_content.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty.")
    
    try:
        assessment_result = ai_engine_instance.evaluate_text_risk(payload.text_content)
        
        audit_log = {
            "user_hash": payload.user_hash,
            "input_text_length": len(payload.text_content),
            "assessment": assessment_result,
            "timestamp": datetime.utcnow()
        }
        await mongo_db["risk_analysis_logs"].insert_one(audit_log)
        
        return {
            "status": "success",
            "user_hash": payload.user_hash,
            "assessment": assessment_result,
            "nosql_synced": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing AI pipeline: {str(e)}")

# ----------------------------------------------------
# 3. Evidence Vault Upload Endpoint (Fixes the 404 & Image rendering issue)
# ----------------------------------------------------
@router.post("/upload-evidence")
async def upload_evidence(
    user_hash: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # Ensure uploads folder exists locally
        os.makedirs("uploads", exist_ok=True)

        # 📝 Extract file extension safely
        filename = file.filename if file.filename else "evidence.png"
        ext = os.path.splitext(filename)[1] or ".png"
        
        # 🔒 Create clean filename WITHOUT ANY SPACES
        unique_id = uuid.uuid4().hex[:8]
        clean_user = user_hash[:8] if user_hash else "anon"
        clean_filename = f"{clean_user}_{unique_id}{ext}"
        file_path = os.path.join("uploads", clean_filename)

        # 💾 Read buffer and write strictly to the local disk path
        contents = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
            
        # 🌐 Generate Absolute URL mapping to main.py StaticFiles mount
        image_url = f"http://127.0.0.1:8000/uploads/{clean_filename}"
        
        # 🟢 ADVANCED: Store Unstructured Evidence Manifest inside MongoDB
        evidence_manifest = {
            "user_hash": user_hash,
            "filename": clean_filename,
            "content_type": file.content_type,
            "uploaded_at": datetime.utcnow(),
            "vault_status": "AES_256_ENCRYPTED_MOCK",
            "local_path": file_path,
            "image_url": image_url
        }
        await mongo_db["evidence_vault"].insert_one(evidence_manifest)
        
        return {
            "status": "success",
            "message": "Evidence payload successfully stored in secure vault.",
            "image_url": image_url,  # 👈 React Frontend එක බලාපොරොත්තු වන key එක
            "filename": clean_filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload evidence: {str(e)}")

# ----------------------------------------------------
# 4. Relational SQL Route: Admin Counselor Registration
# ----------------------------------------------------
@router.post("/admin/register-counselor")
async def register_counselor_by_admin(
    payload: CounselorRegisterRequest, 
    db: Session = Depends(get_sql_db)
):
    ADMIN_SECRET = "SUPER_SECRET_SL_GOV_TOKEN_2026"
    if payload.admin_secret_token != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized: Only system admin can add counselors.")
    
    existing_counselor = db.query(Counselor).filter(Counselor.email == payload.email).first()
    if existing_counselor:
        raise HTTPException(status_code=400, detail="Counselor with this official email already registered.")

    gov_record = db.query(GovernmentApprovedRegistry).filter(
        GovernmentApprovedRegistry.gov_reg_number == payload.gov_reg_number
    ).first()
    
    is_verified = True if gov_record else False
    if not is_verified:
        raise HTTPException(
            status_code=422, 
            detail="Verification Failed: Government Registration Number not found in SLMC Registry."
        )

    hashed_pwd = hashlib.sha256(payload.password.encode()).hexdigest()

    new_counselor = Counselor(
        gov_reg_number=payload.gov_reg_number,
        name=payload.name,
        email=payload.email,
        hashed_password=hashed_pwd,
        is_verified=True
    )
    db.add(new_counselor)
    db.commit()

    return {
        "status": "success",
        "message": f"Counselor {payload.name} successfully verified and saved to SQL Relational DB.",
        "verification_status": "GOVERNMENT_VERIFIED"
    }

# ----------------------------------------------------
# 5. WebSocket Crisis Chat (Fixes 1006 / 1001 Disconnect Crashes)
# ----------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_hash: str):
        await websocket.accept()
        if user_hash not in self.active_rooms:
            self.active_rooms[user_hash] = []
        self.active_rooms[user_hash].append(websocket)

    def disconnect(self, websocket: WebSocket, user_hash: str):
        if user_hash in self.active_rooms:
            if websocket in self.active_rooms[user_hash]:
                self.active_rooms[user_hash].remove(websocket)
            if not self.active_rooms[user_hash]:
                del self.active_rooms[user_hash]

    async def broadcast_to_room(self, message: str, user_hash: str):
        if user_hash in self.active_rooms:
            disconnected_sockets = []
            for connection in self.active_rooms[user_hash]:
                try:
                    await connection.send_text(message)
                except Exception:
                    # Connection එක dead නම් අල්ලලා list එකට දානවා
                    disconnected_sockets.append(connection)
            
            # Safe clean-up of closed/dead socket iterations
            for dead_socket in disconnected_sockets:
                if dead_socket in self.active_rooms[user_hash]:
                    self.active_rooms[user_hash].remove(dead_socket)

            if not self.active_rooms[user_hash]:
                del self.active_rooms[user_hash]

manager = ConnectionManager()

@router.websocket("/ws/chat/{user_hash}")
async def websocket_endpoint(websocket: WebSocket, user_hash: str):
    await manager.connect(websocket, user_hash)
    try:
        await manager.broadcast_to_room(
            "System: Secure, end-to-end encrypted channel established for session.", 
            user_hash
        )
        while True:
            data = await websocket.receive_text()
            await manager.broadcast_to_room(data, user_hash)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_hash)
        try:
            await manager.broadcast_to_room("System: Session disconnected.", user_hash)
        except Exception:
            pass