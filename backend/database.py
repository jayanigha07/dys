"""SQLite database setup using SQLAlchemy ORM."""

from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

DATABASE_URL = "sqlite:///./dyslexia_screening.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    child_name = Column(String, nullable=True)
    child_age = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class GameResult(Base):
    __tablename__ = "game_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    game_name = Column(String, nullable=False)
    accuracy_score = Column(Float, default=0.0)
    avg_response_time = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    confusion_score = Column(Float, default=0.0)
    retry_count = Column(Integer, default=0)
    memory_score = Column(Float, default=0.0)
    reading_time = Column(Float, default=0.0)
    raw_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)          # Low / Medium / High
    risk_label = Column(Integer, nullable=False)          # 0 or 1
    probability_no_risk = Column(Float, default=0.0)
    probability_risk = Column(Float, default=0.0)
    accuracy_score = Column(Float, default=0.0)
    avg_response_time = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    confusion_score = Column(Float, default=0.0)
    retry_count = Column(Integer, default=0)
    memory_score = Column(Float, default=0.0)
    reading_time = Column(Float, default=0.0)
    recommendations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
