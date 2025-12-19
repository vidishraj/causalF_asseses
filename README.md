# Causal Funnel - Event Tracking & Analytics

A full-stack event tracking and analytics system that captures user interactions and provides insights through session analysis and click heatmaps.

## Tech Stack

**Backend:**
- Flask (Python web framework)
- MongoDB (NoSQL database)
- Flask-CORS (Cross-origin resource sharing)
- PyMongo (MongoDB driver)

**Frontend:**
- React 18 (Dashboard UI)
- Vanilla JavaScript (Tracking script)
- Axios (HTTP client)
- CSS3 (Styling)

**Database:**
- MongoDB for event storage and session management

## Project Structure

```
causalFunnel/
├── backend/
│   ├── app.py              # Flask application with API endpoints
│   └── requirements.txt    # Python dependencies
├── dashboard/
│   ├── package.json        # React app dependencies
│   ├── public/
│   │   └── index.html      # HTML template
│   └── src/
│       ├── App.js          # Main React component
│       ├── App.css         # Application styles
│       ├── index.js        # React entry point
│       └── components/
│           ├── SessionsView.js  # Sessions analysis component
│           └── HeatmapView.js   # Click heatmap component
├── tracking/
│   └── tracker.js          # JavaScript tracking script
├── demo/
│   ├── index.html          # Demo page for testing
│   └── page2.html          # Second demo page
└── README.md
```

## Setup Instructions

### Prerequisites
- MongoDB installed and running
- Python 3.7+
- Node.js 14+
- npm or yarn

### 1. Database Setup
Start MongoDB service:
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# Or run directly
mongod
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Backend will run on `http://localhost:5000`

### 3. Dashboard Setup
```bash
cd dashboard
npm install
npm start
```
Dashboard will run on `http://localhost:3000`

### 4. Testing the Tracking
1. Open `demo/index.html` in a web browser
2. Click around the page to generate tracking data
3. Navigate to `demo/page2.html` for cross-page tracking
4. View analytics in the dashboard at `http://localhost:3000`

## Features

### Event Tracking
- **Page Views**: Automatic tracking when pages load
- **Click Events**: Captures click coordinates and target elements
- **Session Management**: Persistent session IDs stored in localStorage
- **Cross-page Tracking**: Maintains session across page navigation

### Analytics Dashboard

#### Overview Dashboard
- **Real-time statistics** with key metrics display
- **Event type breakdown** with visual progress bars
- **System health indicators** and performance monitoring
- **Professional grid layout** with color-coded metrics

#### Sessions View
- **Server-side pagination** for efficient handling of large datasets
- **Real-time search** by session ID with debounced input
- **Advanced sorting** by 8 different criteria:
  - Latest/Oldest Activity
  - Most/Fewest Events
  - Longest/Shortest Sessions
  - Newest/Oldest Sessions
- **Expandable session details** showing complete user journey
- **Chronological event timeline** with user agent and metadata
- **Smart pagination controls** with page numbers and navigation

#### Heatmap View
- **Visual click pattern representation** with intensity mapping
- **Interactive URL selection** from tracked pages
- **Grouped click data** for better visualization and performance
- **Real-time data refresh** with error handling

### API Endpoints

#### Event Management
- `POST /api/events` - Store new tracking events
- `GET /api/health` - System health check
- `GET /api/stats` - Analytics statistics overview

#### Session Management
- `GET /api/sessions` - Retrieve sessions with server-side pagination
  - **Query Parameters:**
    - `page` (int, default: 1) - Page number
    - `limit` (int, default: 10, max: 100) - Items per page
    - `search` (string) - Search by session ID
    - `sort_by` (string, default: 'last_seen') - Sort field: `last_seen`, `first_seen`, `event_count`, `page_count`, `total_duration`
    - `sort_order` (string, default: 'desc') - Sort direction: `asc` or `desc`
  - **Response Format:**
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

- `GET /api/sessions/<id>/events` - Get events for specific session

#### Analytics
- `GET /api/heatmap/<url>` - Get click data for heatmap visualization

## Usage

### Adding Tracking to Your Website
Include the tracking script in your HTML:
```html
<script src="path/to/tracker.js"></script>
```

### Custom Event Tracking
```javascript
// Track custom events
CausalTracker.trackCustomEvent('button_click', { 
  button_type: 'primary',
  section: 'hero'
});
```

## Data Model

### Event Structure
```json
{
  "session_id": "session_1234567890_abc123",
  "event_type": "click|page_view|custom",
  "page_url": "https://example.com/page",
  "timestamp": "2023-01-01T12:00:00Z",
  "click_x": 150,
  "click_y": 300
}
```

## Assumptions & Trade-offs

### Assumptions
- MongoDB is available and accessible
- Users have JavaScript enabled
- Local storage is available for session persistence
- CORS is acceptable for API communication

### Trade-offs
- **Session Persistence**: Uses localStorage instead of server-side sessions for simplicity
- **Real-time Updates**: Dashboard requires manual refresh; no WebSocket implementation
- **Data Retention**: No automatic data cleanup or archiving
- **Security**: Basic implementation without authentication or rate limiting
- **Scalability**: Single-instance setup without clustering or load balancing
- **Click Grouping**: Heatmap groups clicks by 20px regions to reduce visual clutter

### Performance Considerations
- Events are sent immediately to backend (no batching)
- **Server-side pagination** handles large session datasets efficiently
- **MongoDB indexes** optimize query performance for sessions and events
- **Debounced search** reduces API calls during user input
- Heatmap processes click data client-side with smart grouping

## Potential Improvements
- Add user authentication and authorization
- Implement real-time dashboard updates with WebSockets
- Add data retention policies and archiving
- Include A/B testing capabilities
- Add conversion funnel analysis
- Implement event batching for better performance
- Add geographic and device tracking
- Include bounce rate and engagement metrics
- **Extend pagination** to other endpoints (events, heatmap data)
- **Add export functionality** for paginated session data
- **Implement advanced filters** (date ranges, event types, user agents)