from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database import Base

class GovernmentApprovedRegistry(Base):
    __tablename__ = "government_registry"

    gov_reg_number = Column(String, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    medical_council_license = Column(String, nullable=False)

class Counselor(Base):
    __tablename__ = "counselors"

    id = Column(Integer, primary_key=True, index=True)
    gov_reg_number = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)