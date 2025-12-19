import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SessionsView from './components/SessionsView';
import HeatmapView from './components/HeatmapView';
import StatsView from './components/StatsView';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="App">
      <header className="header">
        <h1>Causal Funnel Analytics</h1>
        <nav className="nav">
          <button 
            className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Overview
          </button>
          <button 
            className={`nav-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            Sessions
          </button>
          <button 
            className={`nav-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            Heatmap
          </button>
        </nav>
      </header>
      
      <main className="main">
        {activeTab === 'stats' && <StatsView />}
        {activeTab === 'sessions' && <SessionsView />}
        {activeTab === 'heatmap' && <HeatmapView />}
      </main>
    </div>
  );
}

export default App;