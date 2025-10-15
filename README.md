# Orders Management System

A full-stack web application for managing e-commerce orders with role-based access control, CSV upload functionality, and advanced filtering capabilities.

## Technology Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy
- **Database**: PostgreSQL 15
- **Frontend**: React 18, JavaScript
- **Containerization**: Docker, Docker Compose

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **CSV Upload**: Bulk upload of order data with validation and error handling
- **Data Viewing**: Paginated table view with filtering by email, status, and date range
- **Statistics**: Real-time order statistics and revenue tracking
- **Role Management**:
  - **Admin**: Can upload CSV files and view all data
  - **Viewer**: Can only view data (upload functionality hidden)

## Prerequisites

- Docker (latest version)
- Docker Compose

## Quick Start

### 1. Clone or Extract the Project

```bash
cd orders-management-system
```

### 2. Build and Run

```bash
docker compose build
docker compose up
```

This will:
- Build the PostgreSQL database container
- Build the FastAPI backend container
- Build the React frontend container
- Start all services with proper networking

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 4. Login Credentials

**Admin User (can upload and view):**
- Username: `admin`
- Password: `admin123`

**Viewer User (can only view):**
- Username: `viewer`
- Password: `viewer123`

## Using the Application

### Step 1: Login
1. Open http://localhost:3000 in your browser
2. Enter credentials (use admin for full access)
3. Click "Login"

### Step 2: Upload CSV Data (Admin Only)
1. Click "Upload CSV" in the navigation
2. Click "Choose CSV file..." and select `sample_orders.csv`
3. Click "Upload CSV"
4. View the upload results showing created/failed records

### Step 3: View and Filter Orders
1. Click "View Orders" in the navigation
2. Use filters to search by:
   - Customer email
   - Order status
   - Date range
3. Navigate through pages using pagination controls

## Sample Data

A sample CSV file (`sample_orders.csv`) is included in the project root. It contains 25 sample orders with various statuses and customers.

### CSV Format

Your CSV files must follow this format:

```csv
order_id,customer_email,customer_name,product_name,quantity,unit_price,total_amount,status,order_date
ORD-2024-001,john@email.com,John Doe,Laptop,1,1299.99,1299.99,delivered,2024-01-15T10:30:00
```

**Required Columns:**
- `order_id`: Unique identifier
- `customer_email`: Valid email address
- `customer_name`: Full name
- `product_name`: Product description
- `quantity`: Positive integer
- `unit_price`: Positive decimal
- `total_amount`: Positive decimal
- `status`: One of: pending, processing, shipped, delivered, cancelled
- `order_date`: ISO format (YYYY-MM-DDTHH:MM:SS)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and receive JWT token

### Orders (Authenticated)
- `GET /api/orders` - Get orders with filtering and pagination
  - Query params: `customer_email`, `status`, `start_date`, `end_date`, `page`, `page_size`
- `GET /api/orders/stats` - Get order statistics
- `GET /api/orders/{order_id}` - Get specific order

### Upload (Admin Only)
- `POST /api/upload/orders` - Upload CSV file with orders

## Project Structure

```
orders-management-system/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── database.py          # Database configuration
│   │   ├── auth.py              # Authentication & authorization
│   │   ├── schemas.py           # Pydantic schemas
│   │   └── routers/
│   │       ├── upload.py        # CSV upload endpoints
│   │       └── orders.py        # Order retrieval endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js               # Main application component
│   │   ├── components/
│   │   │   ├── Login.js         # Login component
│   │   │   ├── Upload.js        # CSV upload component
│   │   │   └── Orders.js        # Orders list component
│   │   └── services/
│   │       └── api.js           # API service layer
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── sample_orders.csv
└── README.md
```

## Architecture Highlights

### Database Design
- **Indexed columns** for optimal query performance (customer_email, status, order_date)
- **Composite indexes** for filtered pagination queries
- **Designed for scale**: Can handle tens of millions of records efficiently

### Backend Performance
- **Batch inserts**: CSV uploads process 1000 records at a time
- **Connection pooling**: 20 base connections, 40 max overflow
- **Efficient pagination**: Uses offset/limit with proper indexing
- **Streaming file processing**: Handles large CSV files without memory issues

### Security
- **JWT authentication**: Stateless token-based auth
- **Role-based access control**: Admin vs Viewer permissions
- **Input validation**: Pydantic schemas validate all inputs
- **SQL injection prevention**: SQLAlchemy ORM with parameterized queries
- **CORS configuration**: Restricted to frontend origin

### Frontend Architecture
- **Component-based**: Reusable React components
- **Service layer**: Centralized API communication
- **Local storage**: Persistent authentication
- **Error handling**: User-friendly error messages
- **Responsive design**: Works on desktop and mobile

## Stopping the Application

```bash
docker compose down
```

To remove all data (including database):
```bash
docker compose down -v
```

## Development Notes

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Accessing Database Directly

```bash
docker exec -it orders_db psql -U orders_user -d orders_db
```

### Rebuilding After Code Changes

```bash
docker compose down
docker compose build --no-cache
docker compose up
```

## Performance Considerations

- **Database indexes** optimize queries for common filter patterns
- **Batch processing** handles large CSV uploads efficiently
- **Connection pooling** manages database connections
- **Pagination** prevents loading excessive data
- **Proper caching** in nginx for frontend static assets

## Security Best Practices Implemented

1. Non-root user in Docker containers
2. Health checks for all services
3. Input validation on all endpoints
4. JWT token expiration (8 hours)
5. SQL injection prevention via ORM
6. CORS restrictions
7. Error messages don't leak sensitive information

## Troubleshooting

### Port Already in Use
If ports 3000, 8000, or 5432 are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Change frontend port
  - "8001:8000"  # Change backend port
  - "5433:5432"  # Change database port
```

### Database Connection Issues
Wait for all services to be healthy:
```bash
docker compose ps
```
All services should show "healthy" status.

### Frontend Can't Reach Backend
Ensure CORS is properly configured and both services are running:
```bash
curl http://localhost:8000/health
```

## License

This project is created for demonstration purposes.