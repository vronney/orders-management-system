from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from sqlalchemy.sql import func
from .database import Base

class Order(Base):
    """
    Order model optimized handling millions of records.
    
    Design considerations:
    - Indexed columns for common query patterns (customer_email, order_date, status)
    - Composite index on (order_date, status) for filtered pagination
    - Timestamps for audit trail
    """
    
    __tablename__ = "orders"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Oder information
    order_id = Column(String(50), unique=True, nullable=False, index=True)
    customer_email = Column(String(255), nullable=False, index=True)
    customer_name = Column(String(100), nullable=False)
    product_name = Column(String(500), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), nullable=False, index=True)  # e.g. 'pending', 'shipped', 'delivered'
    order_date = Column(DateTime, nullable=False, index=True)
    
    # Audit timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Composite indexes for optimized queries
    __table_args__ = (
        # For date range + status filtering with pagination
        Index('idx_order_date_status', 'order_date', 'status'),
        
        # For customer-specific queries
        Index('idx_customer_email_order_date', 'customer_email', 'order_date'),
    )
    
    def __repr__(self):
        return f"<Order {self.order_id}>"
    