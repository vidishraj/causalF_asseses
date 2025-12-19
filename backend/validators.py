from typing import Dict, Any, List, Optional
import re
from urllib.parse import urlparse
from logger import log_validation_error

class ValidationError(Exception):
    def __init__(self, field: str, message: str, value: Any = None):
        self.field = field
        self.message = message
        self.value = value
        super().__init__(f"Validation error for {field}: {message}")

class EventValidator:
    REQUIRED_FIELDS = ['session_id', 'event_type', 'page_url']
    VALID_EVENT_TYPES = ['page_view', 'click', 'custom_event', 'page_unload']
    MAX_STRING_LENGTH = 2048
    MAX_URL_LENGTH = 2048
    
    @staticmethod
    def validate_session_id(session_id: Any) -> str:
        if not session_id:
            raise ValidationError('session_id', 'Session ID is required')
        
        session_id = str(session_id).strip()
        
        if len(session_id) < 10:
            raise ValidationError('session_id', 'Session ID too short', session_id)
        
        if len(session_id) > 128:
            raise ValidationError('session_id', 'Session ID too long', session_id)
        
        # Check for valid session ID pattern
        if not re.match(r'^session_\d+_[a-zA-Z0-9]+$', session_id):
            raise ValidationError('session_id', 'Invalid session ID format', session_id)
        
        return session_id
    
    @staticmethod
    def validate_event_type(event_type: Any) -> str:
        if not event_type:
            raise ValidationError('event_type', 'Event type is required')
        
        event_type = str(event_type).strip().lower()
        
        if event_type not in EventValidator.VALID_EVENT_TYPES:
            raise ValidationError(
                'event_type', 
                f'Invalid event type. Must be one of: {", ".join(EventValidator.VALID_EVENT_TYPES)}',
                event_type
            )
        
        return event_type
    
    @staticmethod
    def validate_page_url(page_url: Any) -> str:
        if not page_url:
            raise ValidationError('page_url', 'Page URL is required')
        
        page_url = str(page_url).strip()
        
        if len(page_url) > EventValidator.MAX_URL_LENGTH:
            raise ValidationError('page_url', 'URL too long', len(page_url))
        
        # Basic URL validation
        try:
            parsed = urlparse(page_url)
            if not parsed.scheme and not parsed.netloc and not parsed.path:
                raise ValidationError('page_url', 'Invalid URL format', page_url)
        except Exception:
            raise ValidationError('page_url', 'Invalid URL format', page_url)
        
        return page_url
    
    @staticmethod
    def validate_click_coordinates(click_x: Any, click_y: Any) -> tuple[Optional[int], Optional[int]]:
        if click_x is None and click_y is None:
            return None, None
        
        if click_x is None or click_y is None:
            raise ValidationError('click_coordinates', 'Both click_x and click_y must be provided together')
        
        try:
            x = int(click_x)
            y = int(click_y)
        except (ValueError, TypeError):
            raise ValidationError('click_coordinates', 'Click coordinates must be integers', f"x={click_x}, y={click_y}")
        
        if x < 0 or y < 0:
            raise ValidationError('click_coordinates', 'Click coordinates must be positive', f"x={x}, y={y}")
        
        if x > 10000 or y > 10000:
            raise ValidationError('click_coordinates', 'Click coordinates too large', f"x={x}, y={y}")
        
        return x, y
    
    @staticmethod
    def validate_optional_string(value: Any, field_name: str, max_length: int = None) -> Optional[str]:
        if value is None:
            return None
        
        value = str(value).strip()
        if not value:
            return None
        
        max_len = max_length or EventValidator.MAX_STRING_LENGTH
        if len(value) > max_len:
            raise ValidationError(field_name, f'String too long (max {max_len} characters)', len(value))
        
        return value
    
    @classmethod
    def validate_event_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            raise ValidationError('request_body', 'Request body must be a JSON object')
        
        validated = {}
        errors = []
        
        # Validate required fields
        for field in cls.REQUIRED_FIELDS:
            if field not in data:
                errors.append(ValidationError(field, f'{field} is required'))
        
        if errors:
            raise ValidationError('required_fields', f'Missing required fields: {[e.field for e in errors]}')
        
        try:
            # Validate individual fields
            validated['session_id'] = cls.validate_session_id(data['session_id'])
            validated['event_type'] = cls.validate_event_type(data['event_type'])
            validated['page_url'] = cls.validate_page_url(data['page_url'])
            
            # Validate click coordinates if event type is click
            if validated['event_type'] == 'click':
                x, y = cls.validate_click_coordinates(data.get('click_x'), data.get('click_y'))
                if x is None or y is None:
                    raise ValidationError('click_coordinates', 'Click events must include click_x and click_y')
                validated['click_x'] = x
                validated['click_y'] = y
            else:
                # For non-click events, coordinates are optional
                x, y = cls.validate_click_coordinates(data.get('click_x'), data.get('click_y'))
                validated['click_x'] = x
                validated['click_y'] = y
            
            # Validate optional fields
            validated['user_agent'] = cls.validate_optional_string(data.get('user_agent'), 'user_agent', 512)
            validated['metadata'] = data.get('metadata') if isinstance(data.get('metadata'), dict) else None
            
        except ValidationError as e:
            log_validation_error(e.field, e.value, e.message)
            raise
        
        return validated

class QueryValidator:
    @staticmethod
    def validate_session_id_param(session_id: str) -> str:
        if not session_id:
            raise ValidationError('session_id', 'Session ID parameter is required')
        
        return EventValidator.validate_session_id(session_id)
    
    @staticmethod
    def validate_page_url_param(page_url: str) -> str:
        if not page_url:
            raise ValidationError('page_url', 'Page URL parameter is required')
        
        return EventValidator.validate_page_url(page_url)