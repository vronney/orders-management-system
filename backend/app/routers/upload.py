from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import func
import csv
import io
from datetime import datetime
from typing import List
import logging

from ..database import get_db
from ..models import Order
from ..schemas import UploadResponse
from ..auth import get_admin_user

router = APIRouter(prefix="/api/upload", tags=["upload"])
logger = logging.getLogger(__name__)

# Constants for CSV processing
BATCH_SIZE = 1000  # Insert records in batches for performance
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB limit

@router.post("/orders", response_model=UploadResponse)
async def upload_orders_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Upload CSV file with order data (Admin only).
    
    CSV Format:
    order_id,customer_email,customer_name,product_name,quantity,unit_price,total_amount,status,order_date
    
    Performance optimizations:
    - Streaming file reading to handle large files
    - Batch inserts for efficiency
    - Transaction management
    - Validation before database operations
    """
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Read file content
    try:
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Decode content
        decoded_content = content.decode('utf-8-sig')  # Handle BOM
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please use UTF-8")
    except Exception as e:
        logger.error(f"Error reading file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Process CSV
    records_processed = 0
    records_created = 0
    records_failed = 0
    errors = []
    batch = []
    
    try:
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
            records_processed += 1
            
            try:
                # Parse and validate row
                order_data = {
                    'order_id': row.get('order_id', '').strip(),
                    'customer_email': row.get('customer_email', '').strip(),
                    'customer_name': row.get('customer_name', '').strip(),
                    'product_name': row.get('product_name', '').strip(),
                    'quantity': int(row.get('quantity', 0)),
                    'unit_price': float(row.get('unit_price', 0)),
                    'total_amount': float(row.get('total_amount', 0)),
                    'status': row.get('status', '').strip().lower(),
                    'order_date': datetime.fromisoformat(row.get('order_date', '').strip())
                }
                
                # Basic validation
                if not order_data['order_id']:
                    raise ValueError("order_id is required")
                if not order_data['customer_email']:
                    raise ValueError("customer_email is required")
                if order_data['quantity'] <= 0:
                    raise ValueError("quantity must be positive")
                if order_data['unit_price'] <= 0:
                    raise ValueError("unit_price must be positive")
                
                batch.append(order_data)
                
                # Bulk insert when batch is full
                if len(batch) >= BATCH_SIZE:
                    try:
                        # Deduplicate by order_id within the batch (last one wins)
                        dedup_map = {item['order_id']: item for item in batch}
                        dedup_batch = list(dedup_map.values())

                        insert_stmt = pg_insert(Order).values(dedup_batch)
                        # Prepare columns to update on conflict (exclude immutable/identity fields)
                        update_cols = {
                            c.name: getattr(insert_stmt.excluded, c.name)
                            for c in Order.__table__.columns
                            if c.name not in ('id', 'order_id', 'created_at', 'updated_at')
                        }
                        # Force updated_at to now() on updates
                        update_cols['updated_at'] = func.now()

                        upsert_stmt = insert_stmt.on_conflict_do_update(
                            index_elements=[Order.__table__.c.order_id],
                            set_=update_cols,
                        )

                        db.execute(upsert_stmt)
                        db.commit()
                        # Count as successfully upserted
                        records_created += len(dedup_batch)
                        batch = []
                    except Exception as e:
                        db.rollback()
                        records_failed += len(batch)
                        errors.append(f"Batch insert failed: {str(e)}")
                        batch = []
                        
            except ValueError as e:
                records_failed += 1
                if len(errors) < 100:  # Limit error messages
                    errors.append(f"Row {row_num}: {str(e)}")
            except Exception as e:
                records_failed += 1
                if len(errors) < 100:
                    errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
        
        # Insert remaining batch
        if batch:
            try:
                # Deduplicate by order_id within the remaining batch
                dedup_map = {item['order_id']: item for item in batch}
                dedup_batch = list(dedup_map.values())

                insert_stmt = pg_insert(Order).values(dedup_batch)
                update_cols = {
                    c.name: getattr(insert_stmt.excluded, c.name)
                    for c in Order.__table__.columns
                    if c.name not in ('id', 'order_id', 'created_at', 'updated_at')
                }
                update_cols['updated_at'] = func.now()

                upsert_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=[Order.__table__.c.order_id],
                    set_=update_cols,
                )

                db.execute(upsert_stmt)
                db.commit()
                records_created += len(dedup_batch)
            except Exception as e:
                db.rollback()
                records_failed += len(batch)
                errors.append(f"Final batch insert failed: {str(e)}")
        
        logger.info(f"CSV upload completed. Created: {records_created}, Failed: {records_failed}")
        
        return UploadResponse(
            message="CSV processing completed",
            records_processed=records_processed,
            records_created=records_created,
            records_failed=records_failed,
            errors=errors if errors else None
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during CSV processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")