(function() {
    // Auto-detect API base URL based on current domain
    const API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:5500/api' 
        : `${window.location.protocol}//${window.location.host}/api`;
    
    function getSessionId() {
        let sessionId = localStorage.getItem('causal_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('causal_session_id', sessionId);
        }
        return sessionId;
    }
    
    function sendEvent(eventData) {
        console.log('Sending event:', eventData); // Debug logging
        fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Event tracked successfully:', data);
        })
        .catch(err => {
            console.error('Tracking error:', err);
            console.error('Failed event data:', eventData);
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
        // Get section information if click is within a section
        let sectionInfo = null;
        let target = event.target;
        while (target && target !== document.body) {
            if (target.classList && target.classList.contains('section')) {
                sectionInfo = {
                    section_id: target.id || 'unnamed-section',
                    section_class: 'section'
                };
                break;
            }
            target = target.parentElement;
        }

        const eventData = {
            session_id: getSessionId(),
            event_type: 'click',
            page_url: window.location.href,
            timestamp: new Date().toISOString(),
            click_x: event.clientX,
            click_y: event.clientY
        };

        // Add section metadata if click was within a section
        if (sectionInfo) {
            eventData.metadata = sectionInfo;
        }

        sendEvent(eventData);
    }
    
    function init() {
        console.log('CausalTracker initialized, API_BASE:', API_BASE);
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