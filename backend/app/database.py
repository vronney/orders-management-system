from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Build database URL from environment variables
def get_database_url():
    """
    Construct database URL from environment variables.
    Falls back to individual components if DATABASE_URL is not set.
    """
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        return database_url
    
    # Construct from individual components
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST")
    port = os.getenv("POSTGRES_PORT")
    database = os.getenv("POSTGRES_DB")
    
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"

DATABASE_URL = get_database_url()

# Create engine with performance optimizations
engine = create_engine(
    DATABASE_URL,
    pool_size=20, # connection pool size
    max_overflow=40, # additional connections if pool is full
    pool_pre_ping=True, # check connections before using
    echo=True # set to True for SQL query logging
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """
    Dependency function to get database session.
    Ensures proper cleanup with try/finally.
    """
    db = SessionLocal()
    try: 
        yield db
    finally: 
        db.close()
