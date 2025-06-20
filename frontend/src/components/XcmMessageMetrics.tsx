import React, { useState, useCallback } from 'react';
import { useEventSource } from '../hooks/useEventSource';
import type { EventType } from '../hooks/useEventSource';
import './XcmMessageMetrics.css';

interface XcmCounter {
  sourceChain: string;
  destinationChain: string;
  messagesSent: number;
  messagesProcessed: number;
  messagesFailed: number;
  lastUpdated: string;
}

const XcmMessageMetrics: React.FC = () => {
  const [rcCounter, setRcCounter] = useState<XcmCounter | null>(null);
  const [ahCounter, setAhCounter] = useState<XcmCounter | null>(null);

  // Subscribe to RC and AH XCM message counter events
  const { error } = useEventSource(['rcXcmMessageCounter', 'ahXcmMessageCounter'], useCallback((eventType: EventType, data: XcmCounter) => {
    if (eventType === 'rcXcmMessageCounter') {
      setRcCounter(data);
    } else if (eventType === 'ahXcmMessageCounter') {
      setAhCounter(data);
    }
  }, []));

  // Calculate metrics
  const totalMessagesSent = rcCounter?.messagesSent || 0;
  const totalMessagesProcessed = ahCounter?.messagesProcessed || 0;
  const totalMessagesFailed = ahCounter?.messagesFailed || 0;
  const messagesInFlight = totalMessagesSent - totalMessagesProcessed;
  const errorRate = totalMessagesSent > 0 ? (totalMessagesFailed / totalMessagesSent) * 100 : 0;

  // Determine status for in-flight messages
  const getInFlightStatus = () => {
    if (messagesInFlight === 0) return { text: 'Normal', color: 'var(--success)' };
    if (messagesInFlight <= 5) return { text: 'Low', color: 'var(--warning)' };
    return { text: 'High', color: 'var(--danger)' };
  };

  const inFlightStatus = getInFlightStatus();

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
          <div className="metric-value">{totalMessagesSent.toLocaleString()}</div>
          <div className="metric-label">Total Messages Sent</div>
        </div>
        <div className="metric">
          <div className="metric-value">{totalMessagesProcessed.toLocaleString()}</div>
          <div className="metric-label">Messages Processed</div>
        </div>
        <div className="metric">
          <div className="metric-value">{messagesInFlight.toLocaleString()}</div>
          <div className="metric-label">Messages In-Flight</div>
          <div className="metric-change" style={{ color: inFlightStatus.color }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20V4M12 4L4 12M12 4L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {inFlightStatus.text}
          </div>
        </div>
        <div className="metric">
          <div className="metric-value">{errorRate.toFixed(1)}%</div>
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