from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
import logging

from .database import engine, Base
from .routers import upload, orders
from .schemas import LoginRequest, Token
from .auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Orders Management API",
    description="RESTful API for managing e-commerce orders with role-based access control",
    version="1.0.0"
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(orders.router)
app.include_router(upload.router)

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Orders Management API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth/login",
            "orders": "/api/orders",
            "upload": "/api/upload/orders (admin only)",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy"}

@app.post("/api/auth/login", response_model=Token)
async def login(login_request: LoginRequest):
    """
    Authenticate user and return JWT token.
    
    Users:
    - admin/admin123 (can upload and view)
    - viewer/viewer123 (can only view)
    """
    user = authenticate_user(login_request.username, login_request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    logger.info(f"User {user['username']} logged in successfully")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user["role"]
    )

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return {
        "detail": "Internal server error"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)