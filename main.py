from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.router import router as api_router
import os
import shutil
import uuid

app = FastAPI(title="Anonymous Anti-Cyberbullying API", version="1.0.0")

# 📁 Uploads directory & Static mount
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root_check():
    return {"status": "online"}

@app.post("/api/v1/upload-evidence")
async def upload_evidence(user_hash: str = Form(...), file: UploadFile = File(...)):
    try:
        # File extension
        ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
        if not ext:
            ext = ".png"

        # Unique clean filename
        unique_id = uuid.uuid4().hex[:8]
        clean_user = user_hash[:8] if user_hash else "anon"
        clean_filename = f"{clean_user}_{unique_id}{ext}"
        
        file_path = os.path.join("uploads", clean_filename)

        # Disk එකට write කිරීම
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image_url = f"http://127.0.0.1:8000/uploads/{clean_filename}"
        
        return {
            "status": "success",
            "message": "File uploaded successfully",
            "image_url": image_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))