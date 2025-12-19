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
  
  // Pagination state - now managed by server
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('last_seen');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination metadata from server
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_sessions: 0,
    sessions_per_page: 10,
    has_next: false,
    has_prev: false
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch sessions when pagination or search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSessions();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, sortBy, sortOrder]);

  const fetchSessions = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: sessionsPerPage.toString(),
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const response = await axios.get(`${API_BASE}/sessions?${params}`);
      setSessions(response.data.sessions);
      setPagination(response.data.pagination);
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

  const goToPage = (page) => {
    setCurrentPage(page);
    setSelectedSession(null); // Close any open session details
    setSessionEvents([]);
  };

  const goToPreviousPage = () => {
    if (pagination.has_prev) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (pagination.has_next) {
      goToPage(currentPage + 1);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc'); // Default to desc for new field
    }
    setCurrentPage(1); // Reset to first page when sorting
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
        <div className="sessions-header">
          <h3>Sessions Overview ({pagination.total_sessions} total)</h3>
          <div className="sessions-controls">
            {/* Sort Options */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.375rem',
                fontSize: 'var(--text-sm)',
                backgroundColor: 'white'
              }}
            >
              <option value="last_seen-desc">Latest Activity</option>
              <option value="last_seen-asc">Oldest Activity</option>
              <option value="event_count-desc">Most Events</option>
              <option value="event_count-asc">Fewest Events</option>
              <option value="total_duration-desc">Longest Session</option>
              <option value="total_duration-asc">Shortest Session</option>
              <option value="first_seen-desc">Newest Sessions</option>
              <option value="first_seen-asc">Oldest Sessions</option>
            </select>
            
            <button className="btn" onClick={() => fetchSessions()} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search sessions by ID..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '0.5rem',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-primary)'
            }}
          />
          {searchTerm && (
            <div style={{ marginTop: '0.5rem', fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>
              Found {pagination.total_sessions} session{pagination.total_sessions !== 1 ? 's' : ''} matching "{searchTerm}"
            </div>
          )}
        </div>
        
        {sessions.length === 0 ? (
          <p>{searchTerm ? 'No sessions match your search criteria.' : 'No sessions found. Visit the demo page to generate tracking data.'}</p>
        ) : (
          <div>
            {/* Pagination Info */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-gray-600)'
            }}>
              <span>
                Showing {((pagination.current_page - 1) * pagination.sessions_per_page) + 1}-{Math.min(pagination.current_page * pagination.sessions_per_page, pagination.total_sessions)} of {pagination.total_sessions} sessions
              </span>
              <span>
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
            </div>

            {/* Sessions List */}
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

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginTop: '2rem',
                padding: '1rem 0'
              }}>
                <button 
                  className="btn" 
                  onClick={goToPreviousPage}
                  disabled={!pagination.has_prev}
                  style={{ 
                    padding: '0.5rem 0.75rem',
                    fontSize: 'var(--text-sm)'
                  }}
                >
                  ← Previous
                </button>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, index) => {
                    let pageNumber;
                    if (pagination.total_pages <= 7) {
                      pageNumber = index + 1;
                    } else if (pagination.current_page <= 4) {
                      pageNumber = index + 1;
                    } else if (pagination.current_page >= pagination.total_pages - 3) {
                      pageNumber = pagination.total_pages - 6 + index;
                    } else {
                      pageNumber = pagination.current_page - 3 + index;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => goToPage(pageNumber)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          border: '1px solid var(--color-gray-300)',
                          borderRadius: '0.375rem',
                          background: pageNumber === pagination.current_page ? 'var(--color-blue-600)' : 'white',
                          color: pageNumber === pagination.current_page ? 'white' : 'var(--color-gray-700)',
                          cursor: 'pointer',
                          fontSize: 'var(--text-sm)',
                          fontWeight: pageNumber === pagination.current_page ? '600' : '400',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button 
                  className="btn" 
                  onClick={goToNextPage}
                  disabled={!pagination.has_next}
                  style={{ 
                    padding: '0.5rem 0.75rem',
                    fontSize: 'var(--text-sm)'
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Results Summary */}
            <div style={{ 
              textAlign: 'center', 
              marginTop: '1rem', 
              fontSize: 'var(--text-xs)', 
              color: 'var(--color-gray-500)' 
            }}>
              {pagination.total_pages > 1 && (
                <>Total {pagination.total_sessions} sessions across {pagination.total_pages} pages</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionsView;