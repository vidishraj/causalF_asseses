import os
from datetime import timedelta

class Config:
    # MongoDB Configuration
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/causalfunnel')
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'
    
    # Server Configuration
    HOST = os.environ.get('HOST', '127.0.0.1')
    PORT = int(os.environ.get('PORT', 5500))
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE_MAX_SIZE = int(os.environ.get('LOG_FILE_MAX_SIZE', 10 * 1024 * 1024))  # 10MB
    LOG_FILE_BACKUP_COUNT = int(os.environ.get('LOG_FILE_BACKUP_COUNT', 5))
    
    # Rate Limiting (future enhancement)
    RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'False').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE', 60))
    
    # Validation Configuration
    MAX_EVENT_BATCH_SIZE = int(os.environ.get('MAX_EVENT_BATCH_SIZE', 100))
    MAX_SESSION_DURATION_HOURS = int(os.environ.get('MAX_SESSION_DURATION_HOURS', 24))

class DevelopmentConfig(Config):
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',') if os.environ.get('CORS_ORIGINS') else []

class TestingConfig(Config):
    TESTING = True
    MONGO_URI = os.environ.get('TEST_MONGO_URI', 'mongodb://localhost:27017/causalfunnel_test')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}