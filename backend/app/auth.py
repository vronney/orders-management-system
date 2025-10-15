from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta, timezone
import jwt
from typing import Optional
import os
import sys

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    print("ERROR: SECRET_KEY environment variable is not set!", file=sys.stderr)
    print("Please set SECRET_KEY in your .env file or environment", file=sys.stderr)
    sys.exit(1)

if len(SECRET_KEY) < 32:
    print("WARNING: SECRET_KEY is too short! Use at least 32 characters for security.", file=sys.stderr)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour

# Security scheme
security = HTTPBearer()

# Hardcoded users as per requirements
# In production, this would come from a database with hashed passwords
USERS_DB = {
    "admin": {
        "username": "admin",
        "password": "admin123",  # In production: use bcrypt hashing
        "role": "admin"
    },
    "viewer": {
        "username": "viewer",
        "password": "viewer123",  # In production: use bcrypt hashing
        "role": "viewer"
    }
}

def authenticate_user(username: str, password: str) -> Optional[dict]:
    """
    Authenticate user with username and password.
    Returns user dict if authenticated, None otherwise.
    """
    
    user = USERS_DB.get(username)
    if not user:
        return None
    if user["password"] != password:
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a JWT access token with user data and expiration.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify JWT token and return payload.
    Raises HTTPException if token is invalid.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {"username": username, "role": role}
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(required_role: str):
    """
    Dependency to require specific role.
    Usage: Depends(require_role("admin"))
    """
    def role_checker(current_user: dict = Depends(verify_token)) -> dict:
        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        return current_user
    return role_checker

# Common dependencies
async def get_current_user(current_user: dict = Depends(verify_token)) -> dict:
    """Dependency to get current authenticated user"""
    return current_user

async def get_admin_user(current_user: dict = Depends(require_role("admin"))) -> dict:
    """Dependency to require admin role"""
    return current_user