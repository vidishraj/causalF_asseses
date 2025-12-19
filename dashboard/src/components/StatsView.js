import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

function StatsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      setError(null);
      const response = await axios.get(`${API_BASE}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.response?.data?.message || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">
          <h3>Error Loading Statistics</h3>
          <p>{error}</p>
          <button className="btn" onClick={fetchStats}>Retry</button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="loading">No statistics available</div>;
  }

  return (
    <div>
      <h2>Analytics Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <h3 style={{ color: '#3742fa', marginBottom: '10px' }}>Total Events</h3>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2f3640' }}>
            {formatNumber(stats.total_events)}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            All tracked interactions
          </div>
        </div>

        <div className="card">
          <h3 style={{ color: '#2ed573', marginBottom: '10px' }}>Active Sessions</h3>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2f3640' }}>
            {formatNumber(stats.total_sessions)}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Unique user sessions
          </div>
        </div>

        <div className="card">
          <h3 style={{ color: '#ff6b6b', marginBottom: '10px' }}>Recent Activity</h3>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2f3640' }}>
            {formatNumber(stats.recent_events_24h)}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Events in last 24 hours
          </div>
        </div>

        <div className="card">
          <h3 style={{ color: '#ffa502', marginBottom: '10px' }}>Avg Events/Session</h3>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2f3640' }}>
            {stats.total_sessions > 0 ? Math.round((stats.total_events / stats.total_sessions) * 10) / 10 : 0}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Average engagement
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Event Types Breakdown</h3>
          <button className="btn" onClick={fetchStats} disabled={loading}>
            Refresh
          </button>
        </div>
        
        {stats.event_types && stats.event_types.length > 0 ? (
          <div>
            {stats.event_types.map((eventType, index) => {
              const percentage = stats.total_events > 0 ? (eventType.count / stats.total_events * 100) : 0;
              return (
                <div key={index} style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {eventType._id.replace('_', ' ')}
                    </span>
                    <span style={{ color: '#666' }}>
                      {formatNumber(eventType.count)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ 
                    height: '8px', 
                    background: '#f1f2f6', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      background: index === 0 ? '#3742fa' : index === 1 ? '#2ed573' : index === 2 ? '#ff6b6b' : '#ffa502',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            No event data available yet. Visit the demo page to generate some tracking data.
          </p>
        )}
      </div>

      <div className="card">
        <h3>System Health</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Last Updated</div>
            <div style={{ fontWeight: 'bold' }}>
              {formatTimestamp(stats.timestamp)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Data Freshness</div>
            <div style={{ fontWeight: 'bold', color: '#2ed573' }}>
              Real-time
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>System Status</div>
            <div style={{ fontWeight: 'bold', color: '#2ed573' }}>
              ✓ Operational
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsView;