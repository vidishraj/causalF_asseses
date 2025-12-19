(function() {
    // Production tracking script - automatically detects API endpoint
    const getApiBase = () => {
        // Use the same domain as the current page
        return window.location.protocol + '//' + window.location.host + '/api';
    };
    
    const API_BASE = getApiBase();
    
    function getSessionId() {
        let sessionId = localStorage.getItem('causal_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('causal_session_id', sessionId);
        }
        return sessionId;
    }
    
    function sendEvent(eventData) {
        fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        }).catch(err => {
            // Silent fail in production
            if (window.console && console.error) {
                console.error('Tracking error:', err);
            }
        });
    }
    
    function trackPageView() {
        const eventData = {
            session_id: getSessionId(),
            event_type: 'page_view',
            page_url: window.location.href,
            timestamp: new Date().toISOString()
        };
        sendEvent(eventData);
    }
    
    function trackClick(event) {
        const eventData = {
            session_id: getSessionId(),
            event_type: 'click',
            page_url: window.location.href,
            timestamp: new Date().toISOString(),
            click_x: event.clientX,
            click_y: event.clientY
        };
        sendEvent(eventData);
    }
    
    function init() {
        // Track initial page view
        trackPageView();
        
        // Track clicks
        document.addEventListener('click', trackClick);
        
        // Track page unload
        window.addEventListener('beforeunload', () => {
            if (navigator.sendBeacon) {
                navigator.sendBeacon(`${API_BASE}/events`, 
                    JSON.stringify({
                        session_id: getSessionId(),
                        event_type: 'page_unload',
                        page_url: window.location.href,
                        timestamp: new Date().toISOString()
                    })
                );
            }
        });
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                sendEvent({
                    session_id: getSessionId(),
                    event_type: 'page_hidden',
                    page_url: window.location.href,
                    timestamp: new Date().toISOString()
                });
            } else {
                sendEvent({
                    session_id: getSessionId(),
                    event_type: 'page_visible',
                    page_url: window.location.href,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose API for custom tracking
    window.CausalTracker = {
        trackCustomEvent: function(eventType, data = {}) {
            const eventData = {
                session_id: getSessionId(),
                event_type: eventType,
                page_url: window.location.href,
                timestamp: new Date().toISOString(),
                metadata: data
            };
            sendEvent(eventData);
        },
        
        trackConversion: function(conversionType, value = null) {
            this.trackCustomEvent('conversion', {
                conversion_type: conversionType,
                value: value
            });
        },
        
        setUserProperty: function(key, value) {
            this.trackCustomEvent('user_property', {
                property: key,
                value: value
            });
        }
    };
})();