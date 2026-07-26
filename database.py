from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient

# 1. SQL Database Setup (PostgreSQL / MySQL) for Strict Relations
SQL_DATABASE_URL = "sqlite:///./gov_registry.db" # Standard Dev DB (Swap to PostgreSQL in Prod)
engine = create_engine(SQL_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. NoSQL Database Setup (MongoDB) for High-Speed Unstructured Data
MONGO_URL = "mongodb://localhost:27017"
mongo_client = AsyncIOMotorClient(MONGO_URL)
mongo_db = mongo_client["cyberbullying_analytics"]

# Helper to get SQL DB Session
def get_sql_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()