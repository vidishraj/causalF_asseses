from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
import json

@dataclass
class Event:
    session_id: str
    event_type: str
    page_url: str
    timestamp: datetime
    click_x: Optional[int] = None
    click_y: Optional[int] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['timestamp'] = self.timestamp
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        if isinstance(data.get('timestamp'), str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
        return cls(**data)
    
    def is_valid(self) -> bool:
        if not self.session_id or not self.event_type or not self.page_url:
            return False
        
        valid_event_types = ['page_view', 'click', 'custom_event', 'page_unload']
        if self.event_type not in valid_event_types:
            return False
            
        if self.event_type == 'click' and (self.click_x is None or self.click_y is None):
            return False
            
        return True

@dataclass
class Session:
    session_id: str
    first_seen: datetime
    last_seen: datetime
    event_count: int = 0
    page_count: int = 0
    total_duration: int = 0  # in seconds
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['first_seen'] = self.first_seen
        data['last_seen'] = self.last_seen
        return data
    
    @classmethod
    def from_aggregation(cls, data: Dict[str, Any]) -> 'Session':
        return cls(
            session_id=data['_id'],
            first_seen=data.get('first_seen'),
            last_seen=data.get('last_seen', data.get('last_activity')),
            event_count=data.get('event_count', 0),
            page_count=data.get('page_count', 0),
            total_duration=data.get('total_duration', 0)
        )

class DatabaseManager:
    def __init__(self, db):
        self.db = db
        self._ensure_indexes()
    
    def _ensure_indexes(self):
        try:
            # Index on session_id for fast event queries
            self.db.events.create_index("session_id")
            
            # Compound index on event_type and page_url for heatmap queries
            self.db.events.create_index([("event_type", 1), ("page_url", 1)])
            
            # Index on timestamp for chronological queries
            self.db.events.create_index("timestamp")
            
            # Index on page_url for URL-based queries
            self.db.events.create_index("page_url")
            
        except Exception as e:
            print(f"Warning: Could not create database indexes: {e}")
    
    def insert_event(self, event: Event) -> str:
        if not event.is_valid():
            raise ValueError("Invalid event data")
        
        result = self.db.events.insert_one(event.to_dict())
        return str(result.inserted_id)
    
    def get_sessions(self) -> list[Session]:
        pipeline = [
            {
                '$group': {
                    '_id': '$session_id',
                    'event_count': {'$sum': 1},
                    'first_seen': {'$min': '$timestamp'},
                    'last_seen': {'$max': '$timestamp'},
                    'page_count': {
                        '$sum': {
                            '$cond': [{'$eq': ['$event_type', 'page_view']}, 1, 0]
                        }
                    }
                }
            },
            {
                '$addFields': {
                    'total_duration': {
                        '$divide': [
                            {'$subtract': ['$last_seen', '$first_seen']},
                            1000  # Convert to seconds
                        ]
                    }
                }
            },
            {'$sort': {'last_seen': -1}}
        ]
        
        sessions_data = list(self.db.events.aggregate(pipeline))
        return [Session.from_aggregation(session) for session in sessions_data]
    
    def get_sessions_paginated(self, page: int = 1, limit: int = 10, search: str = '', 
                              sort_by: str = 'last_seen', sort_order: str = 'desc') -> dict:
        # Build the aggregation pipeline
        pipeline = []
        
        # First, group by session to get session stats
        pipeline.append({
            '$group': {
                '_id': '$session_id',
                'event_count': {'$sum': 1},
                'first_seen': {'$min': '$timestamp'},
                'last_seen': {'$max': '$timestamp'},
                'page_count': {
                    '$sum': {
                        '$cond': [{'$eq': ['$event_type', 'page_view']}, 1, 0]
                    }
                }
            }
        })
        
        # Add calculated fields
        pipeline.append({
            '$addFields': {
                'total_duration': {
                    '$divide': [
                        {'$subtract': ['$last_seen', '$first_seen']},
                        1000  # Convert to seconds
                    ]
                },
                'session_id': '$_id'
            }
        })
        
        # Add search filter if provided
        if search:
            pipeline.append({
                '$match': {
                    '$or': [
                        {'session_id': {'$regex': search, '$options': 'i'}},
                        # Add more search fields as needed
                    ]
                }
            })
        
        # Add sorting
        sort_direction = -1 if sort_order.lower() == 'desc' else 1
        sort_field = 'last_seen'  # Default
        
        if sort_by in ['first_seen', 'last_seen', 'event_count', 'page_count', 'total_duration']:
            sort_field = sort_by
        
        pipeline.append({'$sort': {sort_field: sort_direction}})
        
        # Get total count for pagination
        count_pipeline = pipeline.copy()
        count_pipeline.append({'$count': 'total'})
        
        total_result = list(self.db.events.aggregate(count_pipeline))
        total_sessions = total_result[0]['total'] if total_result else 0
        
        # Add pagination
        skip = (page - 1) * limit
        pipeline.extend([
            {'$skip': skip},
            {'$limit': limit}
        ])
        
        # Execute the main query
        sessions_data = list(self.db.events.aggregate(pipeline))
        sessions = [Session.from_aggregation(session) for session in sessions_data]
        
        # Calculate pagination metadata
        total_pages = (total_sessions + limit - 1) // limit  # Ceiling division
        has_next = page < total_pages
        has_prev = page > 1
        
        return {
            'sessions': sessions,
            'total_sessions': total_sessions,
            'total_pages': total_pages,
            'current_page': page,
            'has_next': has_next,
            'has_prev': has_prev,
            'sessions_per_page': limit
        }
    
    def get_session_events(self, session_id: str) -> list[Event]:
        events_data = list(self.db.events.find(
            {'session_id': session_id}
        ).sort('timestamp', 1))
        
        events = []
        for event_data in events_data:
            event_data.pop('_id', None)  # Remove MongoDB ObjectId
            events.append(Event.from_dict(event_data))
        
        return events
    
    def get_click_heatmap_data(self, page_url: str) -> list[Dict[str, int]]:
        clicks = list(self.db.events.find(
            {
                'event_type': 'click',
                'page_url': page_url,
                'click_x': {'$ne': None},
                'click_y': {'$ne': None}
            },
            {'click_x': 1, 'click_y': 1, '_id': 0}
        ))
        
        return clicks