from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional, List

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    
class LoginRequest(BaseModel):
    username: str
    password: str
    
# Order Schemas
class OrderBase(BaseModel):
    """Base schema order with validation rules"""
    order_id: str = Field(..., min_length=1, max_length=50)
    customer_email: EmailStr
    customer_name: str = Field(..., min_length=2, max_length=255)
    product_name: str = Field(..., min_length=2, max_length=500)
    quantity: int = Field(..., gt=0, description="Quantity must be positive")
    unit_price: float = Field(..., gt=0, description="Price must be positive")
    total_amount: float = Field(..., gt=0)
    status: str = Field(..., min_length=1, max_length=50)
    order_date: datetime
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate status is one of allowed values"""
        allowed_status = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
        if v.lower() not in allowed_status:
            raise ValueError(f'Status must be one of: {", ".join(allowed_status)}')
        return v.lower()    

class OrderCreate(OrderBase):
    """Schema for creating a new order"""
    pass

class OrderResponse(OrderBase):
    """Schema for order response with additional fields"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        
# Pagination and filtering
class OrderFilter(BaseModel):
    """Query parameters for filtering orders"""
    customer_email: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=50, ge=1, le=1000, description="Number of items per page")

class PaginatedOrderResponse(BaseModel):
    """Paginated response for orders"""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[OrderResponse]
    
class UploadResponse(BaseModel):
    """Response schema for CSV upload"""
    message: str
    records_processed: int
    records_created: int
    records_failed: int
    errors: Optional[List[str]] = None