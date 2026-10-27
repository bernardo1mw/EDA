from fastapi import APIRouter
from pydantic import BaseModel
from app.core.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    # Simplified for demo — in production, validate against user DB
    token = create_access_token({"sub": "demo-user", "email": request.email})
    return TokenResponse(access_token=token)
