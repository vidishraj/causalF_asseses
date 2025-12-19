import logging
import logging.handlers
import os
from datetime import datetime
import json
from typing import Dict, Any

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        if hasattr(record, 'user_ip'):
            log_entry['user_ip'] = record.user_ip
            
        if hasattr(record, 'session_id'):
            log_entry['session_id'] = record.session_id
            
        if hasattr(record, 'event_type'):
            log_entry['event_type'] = record.event_type
            
        if hasattr(record, 'error_details'):
            log_entry['error_details'] = record.error_details
            
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
            
        return json.dumps(log_entry)

def setup_logging():
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Create main logger
    logger = logging.getLogger('causal_funnel')
    logger.setLevel(logging.DEBUG)
    
    # Remove existing handlers to prevent duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler for all logs
    file_handler = logging.handlers.RotatingFileHandler(
        'logs/app.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)
    
    # Separate file for errors
    error_handler = logging.handlers.RotatingFileHandler(
        'logs/errors.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JSONFormatter())
    logger.addHandler(error_handler)
    
    # Access log handler
    access_logger = logging.getLogger('access')
    access_logger.setLevel(logging.INFO)
    access_handler = logging.handlers.RotatingFileHandler(
        'logs/access.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    access_handler.setFormatter(JSONFormatter())
    access_logger.addHandler(access_handler)
    
    return logger

def log_api_access(endpoint: str, method: str, ip: str, user_agent: str = None, session_id: str = None):
    access_logger = logging.getLogger('access')
    access_logger.info(
        f"{method} {endpoint}",
        extra={
            'user_ip': ip,
            'user_agent': user_agent,
            'session_id': session_id,
            'endpoint': endpoint,
            'method': method
        }
    )

def log_event_created(event_data: Dict[str, Any], ip: str):
    logger = logging.getLogger('causal_funnel')
    logger.info(
        f"Event created: {event_data.get('event_type')}",
        extra={
            'user_ip': ip,
            'session_id': event_data.get('session_id'),
            'event_type': event_data.get('event_type'),
            'page_url': event_data.get('page_url')
        }
    )

def log_error(message: str, error: Exception = None, **extra_data):
    logger = logging.getLogger('causal_funnel')
    error_details = {
        'error_type': type(error).__name__ if error else 'Unknown',
        'error_message': str(error) if error else message,
        **extra_data
    }
    
    logger.error(
        message,
        extra={'error_details': error_details},
        exc_info=error is not None
    )

def log_validation_error(field: str, value: Any, reason: str, **extra_data):
    logger = logging.getLogger('causal_funnel')
    logger.warning(
        f"Validation error: {field}",
        extra={
            'validation_field': field,
            'validation_value': str(value),
            'validation_reason': reason,
            **extra_data
        }
    )