import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

function HeatmapView() {
  const [pageUrl, setPageUrl] = useState('');
  const [clickData, setClickData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableUrls, setAvailableUrls] = useState([]);
  const [error, setError] = useState(null);
  const [urlsLoading, setUrlsLoading] = useState(true);

  useEffect(() => {
    fetchAvailableUrls();
  }, []);

  const fetchAvailableUrls = async () => {
    setUrlsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/sessions`);
      const sessions = response.data;
      
      const urls = new Set();
      for (const session of sessions) {
        try {
          const eventsResponse = await axios.get(`${API_BASE}/sessions/${session.session_id}/events`);
          eventsResponse.data.forEach(event => {
            if (event.page_url) {
              urls.add(event.page_url);
            }
          });
        } catch (error) {
          console.error('Error fetching events for session:', session.session_id);
        }
      }
      
      setAvailableUrls(Array.from(urls));
      setError(null);
    } catch (error) {
      console.error('Error fetching available URLs:', error);
      setError(error.response?.data?.message || 'Failed to fetch available URLs');
    } finally {
      setUrlsLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    if (!pageUrl) {
      setError('Please select or enter a page URL');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const encodedUrl = encodeURIComponent(pageUrl);
      const response = await axios.get(`${API_BASE}/heatmap/${encodedUrl}`);
      setClickData(response.data);
      
      if (response.data.length === 0) {
        setError('No click data found for this URL. Make sure to click around on the page first.');
      }
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      setError(error.response?.data?.message || 'Failed to fetch heatmap data');
      setClickData([]);
    } finally {
      setLoading(false);
    }
  };

  const getClickIntensity = (clickCount) => {
    if (clickCount <= 5) return 0.3;
    if (clickCount <= 15) return 0.6;
    return 1.0;
  };

  const processClickData = () => {
    const clickMap = {};
    clickData.forEach(click => {
      const key = `${Math.round(click.click_x / 20) * 20},${Math.round(click.click_y / 20) * 20}`;
      clickMap[key] = (clickMap[key] || 0) + 1;
    });
    return clickMap;
  };

  const processedClicks = processClickData();

  return (
    <div>
      <h2>Click Heatmap</h2>
      
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Select Page URL</h3>
          <button 
            className="btn" 
            onClick={fetchAvailableUrls} 
            disabled={urlsLoading}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {urlsLoading ? 'Loading...' : 'Refresh URLs'}
          </button>
        </div>

        {error && (
          <div className="error" style={{ 
            background: '#fee', 
            border: '1px solid #fcc', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            color: '#c33'
          }}>
            {error}
          </div>
        )}
        
        {urlsLoading ? (
          <div className="loading">Loading available URLs...</div>
        ) : availableUrls.length > 0 ? (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Available URLs ({availableUrls.length} found):
            </label>
            <select 
              onChange={(e) => setPageUrl(e.target.value)}
              value={pageUrl}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                marginBottom: '10px'
              }}
            >
              <option value="">Select a URL</option>
              {availableUrls.map((url, index) => (
                <option key={index} value={url}>{url}</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
            <p>No pages with tracking data found. Visit the demo page and click around to generate data.</p>
          </div>
        )}
        
        <input
          type="text"
          className="url-input"
          placeholder="Or enter page URL manually (e.g., http://localhost:8080/index.html)"
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
        />
        
        <button 
          className="btn" 
          onClick={fetchHeatmapData}
          disabled={!pageUrl || loading}
        >
          {loading ? 'Loading Heatmap...' : 'Load Heatmap'}
        </button>
        
        {clickData.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4>Click Data for: {pageUrl}</h4>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Total clicks: {clickData.length}
            </p>
            
            <div className="heatmap-container" style={{ position: 'relative', height: '600px' }}>
              {Object.entries(processedClicks).map(([position, count]) => {
                const [x, y] = position.split(',').map(Number);
                return (
                  <div
                    key={position}
                    className="click-dot"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${Math.min(8 + count * 2, 30)}px`,
                      height: `${Math.min(8 + count * 2, 30)}px`,
                      background: `rgba(255, 0, 0, ${getClickIntensity(count)})`,
                      borderRadius: '50%',
                      position: 'absolute',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                      border: '2px solid rgba(255, 255, 255, 0.8)'
                    }}
                    title={`${count} clicks at (${x}, ${y})`}
                  />
                );
              })}
              
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Click positions are grouped by 20px regions
              </div>
            </div>
            
            <div style={{ marginTop: '15px' }}>
              <h4>Raw Click Data:</h4>
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto', 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {clickData.map((click, index) => (
                  <div key={index}>
                    Click {index + 1}: x={click.click_x}, y={click.click_y}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {pageUrl && clickData.length === 0 && !loading && (
          <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
            No click data found for this URL. Try visiting the demo page and clicking around first.
          </div>
        )}
      </div>
    </div>
  );
}

export default HeatmapView;