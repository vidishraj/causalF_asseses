import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

function SessionsView() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API_BASE}/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError(error.response?.data?.message || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionEvents = async (sessionId) => {
    if (selectedSession === sessionId) {
      // Toggle collapse if same session clicked
      setSelectedSession(null);
      setSessionEvents([]);
      return;
    }

    setEventsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/sessions/${sessionId}/events`);
      setSessionEvents(response.data);
      setSelectedSession(sessionId);
    } catch (error) {
      console.error('Error fetching session events:', error);
      setError(error.response?.data?.message || 'Failed to fetch session events');
    } finally {
      setEventsLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatEventType = (eventType) => {
    return eventType.replace('_', ' ').toUpperCase();
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 60) return `${Math.round(seconds || 0)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getSessionStats = (session) => {
    return {
      duration: formatDuration(session.total_duration),
      pageViews: session.page_count || 0,
      firstSeen: session.first_seen ? formatTimestamp(session.first_seen) : 'N/A',
      lastSeen: session.last_seen ? formatTimestamp(session.last_seen) : 'N/A'
    };
  };

  if (loading) {
    return <div className="loading">Loading sessions...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">
          <h3>Error Loading Sessions</h3>
          <p>{error}</p>
          <button className="btn" onClick={fetchSessions}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>User Sessions</h2>
      
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Sessions Overview ({sessions.length} total)</h3>
          <button className="btn" onClick={fetchSessions} disabled={loading}>
            Refresh
          </button>
        </div>
        
        {sessions.length === 0 ? (
          <p>No sessions found. Visit the demo page to generate tracking data.</p>
        ) : (
          <div>
            {sessions.map((session) => {
              const stats = getSessionStats(session);
              return (
                <div 
                  key={session.session_id} 
                  className={`session-item ${selectedSession === session.session_id ? 'expanded' : ''}`}
                  onClick={() => fetchSessionEvents(session.session_id)}
                >
                  <div className="session-header">
                    <div>
                      <div className="session-id">Session: {session.session_id}</div>
                      <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                        Duration: {stats.duration} | Page Views: {stats.pageViews} | Last: {stats.lastSeen}
                      </div>
                    </div>
                    <div className="session-stats">
                      <div className="event-count">
                        {session.event_count} events
                      </div>
                      <div style={{fontSize: '10px', marginTop: '2px'}}>
                        {selectedSession === session.session_id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                  
                  {selectedSession === session.session_id && (
                    <div className="events-list">
                      {eventsLoading ? (
                        <div className="loading">Loading events...</div>
                      ) : (
                        <>
                          <h4>Event Timeline ({sessionEvents.length} events):</h4>
                          <div style={{marginBottom: '10px', fontSize: '12px', color: '#666'}}>
                            Session started: {stats.firstSeen}
                          </div>
                          {sessionEvents.map((event, index) => (
                            <div key={index} className="event-item">
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                  <span className="event-type">{formatEventType(event.event_type)}</span>
                                  {' - '}
                                  <span style={{wordBreak: 'break-all'}}>{event.page_url}</span>
                                  {event.click_x && event.click_y && (
                                    <span style={{color: '#007bff'}}> (clicked at {event.click_x}, {event.click_y})</span>
                                  )}
                                  {event.user_agent && (
                                    <div style={{fontSize: '10px', color: '#999', marginTop: '2px'}}>
                                      {event.user_agent.substring(0, 100)}...
                                    </div>
                                  )}
                                </div>
                                <div style={{fontSize: '11px', color: '#666', marginLeft: '10px', whiteSpace: 'nowrap'}}>
                                  {formatTimestamp(event.timestamp)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionsView;