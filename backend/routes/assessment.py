"""Assessment endpoints — session management and game result storage."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from database import get_db, Session, GameResult
from schemas import SessionCreate, SessionResponse, GameResultCreate, GameResultResponse
from typing import List

router = APIRouter(prefix="/api", tags=["assessment"])


@router.post("/session", response_model=SessionResponse)
def create_session(payload: SessionCreate, db: DBSession = Depends(get_db)):
    session = Session(child_name=payload.child_name, child_age=payload.child_age)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/session/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/game-result", response_model=GameResultResponse)
def save_game_result(payload: GameResultCreate, db: DBSession = Depends(get_db)):
    result = GameResult(**payload.model_dump())
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@router.get("/game-results/{session_id}", response_model=List[GameResultResponse])
def get_game_results(session_id: int, db: DBSession = Depends(get_db)):
    results = db.query(GameResult).filter(GameResult.session_id == session_id).all()
    return results
