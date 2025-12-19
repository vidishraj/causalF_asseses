(function() {
    const API_BASE = 'http://localhost:5500/api';
    
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
        }).catch(err => console.error('Tracking error:', err));
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
        trackPageView();
        
        document.addEventListener('click', trackClick);
        
        window.addEventListener('beforeunload', () => {
            navigator.sendBeacon && navigator.sendBeacon(`${API_BASE}/events`, 
                JSON.stringify({
                    session_id: getSessionId(),
                    event_type: 'page_unload',
                    page_url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            );
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.CausalTracker = {
        trackCustomEvent: function(eventType, data = {}) {
            const eventData = {
                session_id: getSessionId(),
                event_type: eventType,
                page_url: window.location.href,
                timestamp: new Date().toISOString(),
                ...data
            };
            sendEvent(eventData);
        }
    };
})();