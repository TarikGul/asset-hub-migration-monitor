import React from 'react';
import './MigrationStatus.css';

const MigrationStatus: React.FC = () => {
  return (
    <section className="card migration-status">
      <div className="card-header">
        <h2 className="card-title">Migration Status</h2>
        <div className="card-actions">
          {/* Icons for card actions would go here */}
        </div>
      </div>
      
      <div className="stage-display">
        <div className="stage-name">Loading...</div>
        <div className="stage-description">Waiting for migration status updates</div>
      </div>
      
      <div className="progress-container">
        <div className="progress-header">
          <span className="progress-label">Overall Progress</span>
          <span className="progress-value">0%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '0%' }}></div>
        </div>
      </div>
      
      <div className="timeline">
        <div className="timeline-point">
          <div className="point-marker"></div>
          <div className="point-label">Account Migration</div>
        </div>
        <div className="timeline-point">
          <div className="point-marker"></div>
          <div className="point-label">Multisig Migration</div>
        </div>
        <div className="timeline-point">
          <div className="point-marker"></div>
          <div className="point-label">Claims Migration</div>
        </div>
        <div className="timeline-point">
          <div className="point-marker"></div>
          <div className="point-label">Conviction Voting</div>
        </div>
        <div className="timeline-point">
          <div className="point-marker"></div>
          <div className="point-label">Treasury</div>
        </div>
        <div className="timeline-point">
          <div className="point-marker"></div>
          <div className="point-label">Complete</div>
        </div>
      </div>
      
      <div className="health-indicators">
        <div className="health-indicator">
          <div className="indicator-dot dot-green"></div>
          <span className="indicator-label">Overall Status</span>
        </div>
        <div className="health-indicator">
          <div className="indicator-dot dot-yellow"></div>
          <span className="indicator-label">XCM Messages</span>
        </div>
        <div className="health-indicator">
          <div className="indicator-dot dot-green"></div>
          <span className="indicator-label">Balance Consistency</span>
        </div>
      </div>
    </section>
  );
};

export default MigrationStatus; 