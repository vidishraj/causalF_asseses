# Causal Funnel - Event Tracking & Analytics

A production-ready full-stack event tracking and analytics system that captures user interactions and provides insights through session analysis and click heatmaps. Built for scalability and ease of deployment.

## Tech Stack

**Backend:**
- Flask (Python web framework)
- MongoDB (NoSQL database with optimized indexes)
- Flask-CORS (Cross-origin resource sharing)
- PyMongo (MongoDB driver)
- Gunicorn (Production WSGI server)

**Frontend:**
- React 18 (Dashboard UI)
- Vanilla JavaScript (Tracking script)
- Axios (HTTP client)
- CSS3 with Google Fonts (Modern typography)

**Infrastructure:**
- Nginx (Reverse proxy and static file serving)
- Systemd (Service management)
- Oracle Linux compatible deployment

**Database:**
- MongoDB with optimized indexes for performance
- Automatic database connection management
- Efficient aggregation pipelines

## Project Structure

```
causalFunnel/
├── backend/
│   ├── app.py              # Flask application with API endpoints
│   ├── models.py           # Database models and manager
│   ├── validators.py       # Input validation and error handling
│   ├── logger.py           # Logging configuration
│   └── requirements.txt    # Python dependencies
├── dashboard/
│   ├── package.json        # React app dependencies
│   ├── public/
│   │   └── index.html      # HTML template
│   └── src/
│       ├── App.js          # Main React component
│       ├── App.css         # Modern styling with CSS custom properties
│       ├── config.js       # API configuration
│       ├── index.js        # React entry point
│       └── components/
│           ├── SessionsView.js  # Advanced sessions analysis
│           └── HeatmapView.js   # Interactive click heatmaps
├── tracking/
│   └── tracker.js          # JavaScript tracking script
├── demo/
│   ├── index.html          # Demo page for testing
│   └── page2.html          # Second demo page
├── deploy/
│   └── deploy.sh           # Production deployment script
└── README.md
```

## Quick Start

### Development Setup

1. **Prerequisites**
   - MongoDB installed and running
   - Python 3.7+
   - Node.js 14+

2. **Database Setup**
   ```bash
   # Start MongoDB
   mongod
   ```

3. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
   Backend runs on `http://localhost:5500`

4. **Dashboard Setup**
   ```bash
   cd dashboard
   npm install
   npm start
   ```
   Dashboard runs on `http://localhost:3000`

5. **Test the System**
   - Open `demo/index.html` in a browser
   - Click around to generate tracking data
   - View analytics at `http://localhost:3000`


## Features

### 🎯 Event Tracking
- **Automatic Page Views**: Zero-config tracking when pages load
- **Precise Click Tracking**: Captures exact click coordinates and target elements
- **Session Management**: Persistent session IDs with localStorage
- **Cross-page Tracking**: Seamless session continuity across navigation
- **Custom Events**: Extensible API for custom event tracking

### 📊 Analytics Dashboard

#### Overview Dashboard
- **Real-time Metrics**: Live statistics with key performance indicators
- **Event Type Breakdown**: Visual distribution with animated progress bars
- **System Health Monitoring**: Database connection and performance status
- **Professional Design**: Modern grid layout with responsive design

#### Advanced Sessions View
- **Server-side Pagination**: Handles thousands of sessions efficiently
- **Real-time Search**: Debounced search by session ID (300ms delay)
- **8 Advanced Sorting Options**:
  - Latest/Oldest Activity (last_seen)
  - Most/Fewest Events (event_count)
  - Longest/Shortest Sessions (total_duration)
  - Newest/Oldest Sessions (first_seen)
- **Expandable Details**: Complete user journey with event timeline
- **Smart Pagination**: Page numbers with context-aware navigation
- **Performance Optimized**: MongoDB aggregation for fast queries

#### Interactive Heatmap View
- **Visual Click Patterns**: Intensity-based visualization with opacity mapping
- **Dropdown URL Selection**: Automatically populated from tracked pages
- **Smart Click Grouping**: 20px region grouping for cleaner visualization
- **Real-time Updates**: Live data refresh with comprehensive error handling
- **Flask URL Handling**: Robust handling of encoded URLs and double slashes

### 🎨 Modern UI/UX
- **Google Fonts Integration**: Inter (primary) and JetBrains Mono (code)
- **CSS Custom Properties**: Consistent design system with CSS variables
- **Typography Scale**: Professional type hierarchy (xs to 4xl)
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Loading States**: Smooth loading indicators and error boundaries

### 🔧 Robust Backend Architecture

#### Database Layer
- **Optimized MongoDB Indexes**: Performance-tuned for common queries
- **Data Models**: Structured Event and Session models with validation
- **Aggregation Pipelines**: Efficient server-side data processing
- **Connection Management**: Automatic reconnection and health monitoring

#### API Layer
- **RESTful Design**: Clean, consistent API endpoints
- **Comprehensive Validation**: Input sanitization and error handling
- **Request Logging**: Detailed access logs with IP and user agent tracking
- **Error Handling**: Graceful error responses with helpful messages
- **CORS Configuration**: Proper cross-origin setup for production

#### Production Features
- **Gunicorn Integration**: Multi-worker WSGI server setup
- **Nginx Configuration**: Reverse proxy with optimized settings
- **Systemd Services**: Automatic startup and process management
- **Health Checks**: Database connectivity and system status monitoring

## API Reference

### Event Management
- `POST /api/events` - Store tracking events with validation
- `GET /api/health` - System health and database status
- `GET /api/stats` - Analytics overview with event breakdowns

### Session Management
- `GET /api/sessions` - Paginated sessions with advanced filtering
  
  **Query Parameters:**
  - `page` (int, default: 1) - Page number
  - `limit` (int, default: 10, max: 100) - Items per page  
  - `search` (string) - Search by session ID (supports regex)
  - `sort_by` (string) - Sort field: `last_seen`, `first_seen`, `event_count`, `page_count`, `total_duration`
  - `sort_order` (string) - Direction: `asc` or `desc`

  **Response Format:**
  ```json
  {
    "sessions": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_sessions": 47,
      "sessions_per_page": 10,
      "has_next": true,
      "has_prev": false
    },
    "search": "session_123",
    "sort": {
      "sort_by": "last_seen",
      "sort_order": "desc"
    }
  }
  ```

- `GET /api/sessions/<id>/events` - Chronological events for session

### Analytics
- `GET /api/heatmap/<url>` - Click coordinates with proper URL decoding

## Usage Examples

### Basic Integration
```html
<!-- Add to any webpage -->
<script src="https://yourdomain.com/tracker.js"></script>
```

### Custom Event Tracking
```javascript
// Track custom interactions
CausalTracker.trackCustomEvent('button_click', {
  button_type: 'primary',
  section: 'hero',
  campaign: 'summer_sale'
});

// Track form submissions
CausalTracker.trackCustomEvent('form_submit', {
  form_type: 'newsletter',
  source: 'homepage'
});
```


## Data Models

### Event Structure
```json
{
  "session_id": "session_1766130095135_abc123",
  "event_type": "click|page_view|custom_event|page_unload",
  "page_url": "https://example.com/products/shoes",
  "timestamp": "2025-12-19T07:41:35.263000Z",
  "click_x": 247,
  "click_y": 265,
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.100",
  "metadata": {
    "button_type": "primary",
    "section": "checkout"
  }
}
```

### Session Aggregation
```json
{
  "session_id": "session_1766130095135_abc123",
  "event_count": 15,
  "page_count": 4,
  "total_duration": 245.7,
  "first_seen": "2025-12-19T07:41:35.263000Z",
  "last_seen": "2025-12-19T07:45:41.026000Z",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.100"
}
```

## Performance & Scalability

### Database Optimization
- **Compound Indexes**: `(event_type, page_url)` for heatmap queries
- **Session Indexes**: Optimized for session_id and timestamp queries
- **Aggregation Pipelines**: Server-side processing reduces data transfer
- **Pagination**: Efficient `$skip` and `$limit` operations

### Frontend Performance
- **Debounced Search**: 300ms delay prevents excessive API calls
- **Smart Pagination**: Context-aware page number rendering
- **Component Optimization**: Efficient React state management
- **CSS Variables**: Fast style updates without recalculation

### Backend Scaling
- **Gunicorn Workers**: Multi-process request handling
- **Connection Pooling**: Efficient MongoDB connection management
- **Request Logging**: Structured logs for monitoring and debugging
- **Error Boundaries**: Graceful failure handling

## Deployment Architecture

### Production Stack
```
Internet
    ↓
Nginx (Reverse Proxy)
    ↓
Gunicorn (WSGI Server)
    ↓
Flask Application
    ↓
MongoDB Database
```

### File Structure in Production
```
/opt/causal-funnel/
├── backend/          # Flask application
├── dashboard/build/  # React production build
├── tracking/         # Static tracking script
└── demo/            # Demo pages
```

### Service Configuration
- **Backend**: `systemctl status causal-funnel-backend`
- **Nginx**: Serves static files and proxies API requests
- **MongoDB**: Dedicated database with optimized configuration
- **Logs**: Centralized logging with rotation

## Monitoring & Debugging

### Health Checks
```bash
# Check system health
curl https://yourdomain.com/api/health

# Monitor service status
systemctl status causal-funnel-backend
systemctl status nginx
systemctl status mongod
```

### Log Analysis
```bash
# Backend application logs
sudo journalctl -u causal-funnel-backend -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

## Security Considerations

### Current Implementation
- Input validation with comprehensive error handling
- CORS configuration for controlled access
- IP address logging for audit trails
- SQL injection prevention (NoSQL database)
- HTTPS enforcement with SSL/TLS encryption

### Recommended Enhancements
- Rate limiting per IP address
- API authentication with tokens
- Data encryption at rest
- Session security hardening
- Access control and user permissions

## Known Issues & Solutions

### Fixed Issues
1. **Flask URL Parameter Issue**: Double slashes in URLs (https://) were being consumed by Flask's `<path:>` parameter, causing heatmap queries to fail. Fixed with URL reconstruction logic.

2. **Pagination API Format**: Frontend expected array response but backend returned object with pagination metadata. Fixed by updating HeatmapView to use `response.data.sessions`.

3. **CORS Configuration**: Cross-origin requests failing during development. Fixed with proper Flask-CORS setup allowing all origins for development.

4. **Package Manager Compatibility**: Deployment script failed on Oracle Linux using yum/dnf instead of apt. Fixed with automatic package manager detection.

### Current Limitations
- No real-time updates (requires manual refresh)
- Single-instance deployment (no clustering)
- Basic error handling (no retry mechanisms)
- Limited export functionality
- No data retention policies


---

**Built with ❤️ for modern web analytics**

*This project demonstrates production-ready full-stack development with attention to performance, scalability, and user experience.*