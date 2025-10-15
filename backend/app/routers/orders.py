from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
import logging
import math

from ..database import get_db
from ..models import Order
from ..schemas import OrderResponse, PaginatedOrderResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/orders", tags=["orders"])
logger = logging.getLogger(__name__)

@router.get("", response_model=PaginatedOrderResponse)
async def get_orders(
    customer_email: Optional[str] = Query(None, description="Filter by customer email"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    start_date: Optional[datetime] = Query(None, description="Filter orders after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter orders before this date"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=1000, description="Items per page"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get orders with filtering and pagination.
    
    Available to both admin and viewer roles.
    
    Filters:
    - customer_email: Exact match on customer email
    - status: Exact match on order status
    - start_date: Orders on or after this date
    - end_date: Orders on or before this date
    
    Performance optimizations:
    - Uses composite indexes for filtered queries
    - Efficient COUNT query
    - Proper offset/limit pagination
    """
    
    try:
        # Build base query
        query = db.query(Order)
        
        # Apply filters
        if customer_email:
            query = query.filter(Order.customer_email == customer_email)
        
        if status:
            query = query.filter(Order.status == status.lower())
        
        if start_date:
            query = query.filter(Order.order_date >= start_date)
        
        if end_date:
            query = query.filter(Order.order_date <= end_date)
        
        # Get total count (optimized query)
        total = query.count()
        
        # Calculate pagination
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        offset = (page - 1) * page_size
        
        # Get paginated results ordered by date (most recent first)
        orders = query.order_by(Order.order_date.desc()) \
                     .offset(offset) \
                     .limit(page_size) \
                     .all()
        
        logger.info(f"Retrieved {len(orders)} orders (page {page}/{total_pages})")
        
        return PaginatedOrderResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            data=orders
        )
        
    except Exception as e:
        logger.error(f"Error retrieving orders: {str(e)}")
        raise

@router.get("/stats")
async def get_order_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary statistics for orders.
    
    Returns:
    - Total orders
    - Total revenue
    - Orders by status
    """
    
    try:
        # Total orders and revenue
        total_stats = db.query(
            func.count(Order.id).label('total_orders'),
            func.sum(Order.total_amount).label('total_revenue')
        ).first()
        
        # Orders by status
        status_counts = db.query(
            Order.status,
            func.count(Order.id).label('count')
        ).group_by(Order.status).all()
        
        return {
            "total_orders": total_stats.total_orders or 0,
            "total_revenue": float(total_stats.total_revenue or 0),
            "by_status": {status: count for status, count in status_counts}
        }
        
    except Exception as e:
        logger.error(f"Error retrieving stats: {str(e)}")
        raise

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_by_id(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific order by order_id"""
    
    order = db.query(Order).filter(Order.order_id == order_id).first()
    
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order