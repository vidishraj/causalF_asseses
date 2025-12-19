from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from datetime import datetime
import os
from functools import wraps
from urllib.parse import unquote

from models import Event, DatabaseManager
from validators import EventValidator, QueryValidator, ValidationError
from logger import setup_logging, log_api_access, log_event_created, log_error

app = Flask(__name__)
CORS(app, origins=['*'], methods=['GET', 'POST', 'OPTIONS'], allow_headers=['Content-Type'])

app.config["MONGO_URI"] = os.environ.get("MONGO_URI", "mongodb://localhost:27017/causalfunnel")
mongo = PyMongo(app)

logger = setup_logging()
db_manager = DatabaseManager(mongo.db)

def get_client_ip():
    if request.environ.get('HTTP_X_FORWARDED_FOR') is None:
        return request.environ['REMOTE_ADDR']
    else:
        return request.environ['HTTP_X_FORWARDED_FOR']

def log_request(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        log_api_access(
            endpoint=request.endpoint or request.path,
            method=request.method,
            ip=get_client_ip(),
            user_agent=request.headers.get('User-Agent'),
            session_id=request.json.get('session_id') if request.is_json else None
        )
        return f(*args, **kwargs)
    return decorated_function

@app.errorhandler(ValidationError)
def handle_validation_error(error):
    logger.warning(f"Validation error: {error}")
    return jsonify({
        'error': 'Validation failed',
        'field': error.field,
        'message': error.message,
        'value': str(error.value) if error.value is not None else None
    }), 400

@app.errorhandler(500)
def handle_internal_error(error):
    log_error("Internal server error", error.original_exception if hasattr(error, 'original_exception') else None)
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred. Please try again later.'
    }), 500

@app.errorhandler(404)
def handle_not_found(error):
    return jsonify({
        'error': 'Not found',
        'message': 'The requested resource was not found.'
    }), 404

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        mongo.db.command('ping')
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        })
    except Exception as e:
        log_error("Health check failed", e)
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'disconnected',
            'error': str(e)
        }), 503

@app.route('/api/events', methods=['POST', 'OPTIONS'])
@log_request
def create_event():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if not request.is_json:
            raise ValidationError('content_type', 'Request must be JSON')
        
        data = request.get_json()
        if not data:
            raise ValidationError('request_body', 'Request body is empty')
        
        # Validate event data
        validated_data = EventValidator.validate_event_data(data)
        
        # Create event model
        event = Event(
            session_id=validated_data['session_id'],
            event_type=validated_data['event_type'],
            page_url=validated_data['page_url'],
            timestamp=datetime.utcnow(),
            click_x=validated_data.get('click_x'),
            click_y=validated_data.get('click_y'),
            user_agent=request.headers.get('User-Agent'),
            ip_address=get_client_ip(),
            metadata=validated_data.get('metadata')
        )
        
        # Insert event
        event_id = db_manager.insert_event(event)
        
        # Log successful event creation
        log_event_created(validated_data, get_client_ip())
        
        return jsonify({
            'success': True,
            'id': event_id,
            'timestamp': event.timestamp.isoformat()
        }), 201
        
    except ValidationError:
        raise  # Re-raise validation errors to be handled by error handler
    except Exception as e:
        log_error("Failed to create event", e, 
                 user_ip=get_client_ip(),
                 request_data=request.get_json())
        raise

@app.route('/api/sessions', methods=['GET'])
@log_request
def get_sessions():
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '', type=str)
        sort_by = request.args.get('sort_by', 'last_seen', type=str)
        sort_order = request.args.get('sort_order', 'desc', type=str)
        
        # Validate parameters
        page = max(1, page)
        limit = min(max(1, limit), 100)  # Limit between 1 and 100
        
        # Get paginated sessions
        result = db_manager.get_sessions_paginated(
            page=page,
            limit=limit,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Convert sessions to JSON-serializable format
        sessions_data = []
        for session in result['sessions']:
            session_dict = session.to_dict()
            session_dict['first_seen'] = session.first_seen.isoformat() if session.first_seen else None
            session_dict['last_seen'] = session.last_seen.isoformat() if session.last_seen else None
            sessions_data.append(session_dict)
        
        response_data = {
            'sessions': sessions_data,
            'pagination': {
                'current_page': page,
                'total_pages': result['total_pages'],
                'total_sessions': result['total_sessions'],
                'sessions_per_page': limit,
                'has_next': result['has_next'],
                'has_prev': result['has_prev']
            },
            'search': search,
            'sort': {
                'sort_by': sort_by,
                'sort_order': sort_order
            }
        }
        
        logger.info(f"Retrieved {len(sessions_data)} sessions (page {page} of {result['total_pages']})")
        return jsonify(response_data)
        
    except Exception as e:
        log_error("Failed to retrieve sessions", e)
        raise

@app.route('/api/sessions/<session_id>/events', methods=['GET'])
@log_request
def get_session_events(session_id):
    try:
        # Validate session ID
        validated_session_id = QueryValidator.validate_session_id_param(session_id)
        
        events = db_manager.get_session_events(validated_session_id)
        
        # Convert events to JSON-serializable format
        events_data = []
        for event in events:
            event_dict = event.to_dict()
            event_dict['timestamp'] = event.timestamp.isoformat()
            events_data.append(event_dict)
        
        logger.info(f"Retrieved {len(events_data)} events for session {validated_session_id}")
        return jsonify(events_data)
        
    except ValidationError:
        raise
    except Exception as e:
        log_error("Failed to retrieve session events", e, session_id=session_id)
        raise

@app.route('/api/heatmap/<path:page_url>', methods=['GET'])
@log_request
def get_heatmap_data(page_url):
    try:
        # URL decode the page_url parameter
        decoded_page_url = unquote(page_url)
        
        # Validate page URL
        validated_page_url = QueryValidator.validate_page_url_param(decoded_page_url)
        
        clicks = db_manager.get_click_heatmap_data(validated_page_url)
        
        logger.info(f"Retrieved {len(clicks)} clicks for heatmap of {validated_page_url}")
        return jsonify(clicks)
        
    except ValidationError:
        raise
    except Exception as e:
        log_error("Failed to retrieve heatmap data", e, page_url=page_url)
        raise

@app.route('/api/stats', methods=['GET'])
@log_request
def get_stats():
    try:
        # Get basic statistics
        total_events = mongo.db.events.count_documents({})
        total_sessions = len(mongo.db.events.distinct('session_id'))
        
        # Get event type breakdown
        event_types = list(mongo.db.events.aggregate([
            {'$group': {'_id': '$event_type', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]))
        
        # Get recent activity (last 24 hours)
        yesterday = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        recent_events = mongo.db.events.count_documents({
            'timestamp': {'$gte': yesterday}
        })
        
        stats = {
            'total_events': total_events,
            'total_sessions': total_sessions,
            'recent_events_24h': recent_events,
            'event_types': event_types,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify(stats)
        
    except Exception as e:
        log_error("Failed to retrieve stats", e)
        raise

if __name__ == '__main__':
    logger.info("Starting Causal Funnel Backend")
    logger.info(f"MongoDB URI: {app.config['MONGO_URI']}")
    app.run(debug=True, port=5500, host='0.0.0.0')