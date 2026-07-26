🛡️ AI-Powered Anonymous Crisis Intervention & Evidence Platform
An end-to-end full-stack platform designed for cryptographic anonymity, automated NLP risk triage, real-time crisis tunneling via WebSockets, and secure evidence vault management.

🌟 Key Features
🤖 Automated AI NLP Triage: Integrates HuggingFace Transformers (RoBERTa architecture) to analyze text reports in real-time, assigning severity scores (~0.0 to 1.0) and categorizing them into LOW, MEDIUM, or HIGH risk levels.

🚨 Stateful Real-Time Crisis Tunneling: High-risk evaluations instantly trigger full-duplex WebSocket connections, tunneling the anonymous user directly to a live verified counselor.

📸 Secure Evidence Vault: Enables victims to upload screenshot payloads safely. Images are sanitized with unique identifiers to prevent broken paths or PII exposure.

👨‍⚕️ Counselor Verification & Emergency Escalation: Includes a government registry verification system (SLMC lookup) for counselors and a silent, one-click crisis escalation mechanism (MOH/1926 Gateway).

🏛️ Hybrid Database Architecture: * MySQL (Relational SQL): Ensures ACID compliance and strict relational integrity for government counselor authentication and user authorization.

MongoDB (Document NoSQL): Handles high-throughput, dynamic schema storage for AI audit logs and evidence metadata manifests.

🏗️ System Architecture
[ Anonymous User / React UI ]
        │
        ├── (REST APIs) ──────────► [ FastAPI Backend ]
        │                                  │
        ├── (WebSocket Live Chat) ─────────┼───► [ HuggingFace AI Engine (RoBERTa) ]
        │                                  │
        └── (Evidence Uploads) ───────────┼───► [ MySQL Database (SQLAlchemy) ]
                                           │
                                           └──► [ MongoDB (NoSQL Audit Vault) ]
🛠️ Tech Stack
Frontend: React.js, Tailwind CSS

Backend: FastAPI (Python 3.12+), Uvicorn ASGI, WebSockets

Databases: MySQL (Relational), MongoDB (NoSQL Motor/PyMongo)

AI/NLP Engine: HuggingFace Core (PyTorch / Transformers)

🚀 Getting Started (Local Setup)
Prerequisites
Make sure you have the following installed on your machine:

Python 3.10+

Node.js 18+ & npm

MySQL Server & MongoDB
