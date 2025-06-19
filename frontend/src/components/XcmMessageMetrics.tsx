import React from 'react';
import './XcmMessageMetrics.css';

const XcmMessageMetrics: React.FC = () => {
  return (
    <section className="card xcm-messages">
      <div className="card-header">
        <h2 className="card-title">XCM Message Metrics</h2>
        <div className="card-actions">
          {/* Icons for card actions would go here */}
        </div>
      </div>
      
      <div className="message-metrics">
        <div className="metric">
          <div className="metric-value">0</div>
          <div className="metric-label">Total Messages Sent</div>
        </div>
        <div className="metric">
          <div className="metric-value">0</div>
          <div className="metric-label">Messages Processed</div>
        </div>
        <div className="metric">
          <div className="metric-value">0</div>
          <div className="metric-label">Messages In-Flight</div>
          <div className="metric-change">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20V4M12 4L4 12M12 4L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Normal
          </div>
        </div>
        <div className="metric">
          <div className="metric-value">0%</div>
          <div className="metric-label">Error Rate</div>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="chart-placeholder">
          XCM Message Queue Graph
        </div>
      </div>
    </section>
  );
};

export default XcmMessageMetrics; 