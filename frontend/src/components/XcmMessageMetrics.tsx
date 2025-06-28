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

interface DmpLatency {
  latencyMs: number;
  averageLatencyMs: number;
  blockNumber: number;
  timestamp: string;
}

interface DmpQueueEvent {
  queueSize: number;
  totalSizeBytes: number;
  eventType: string;
  blockNumber: number;
  timestamp: string;
}

const XcmMessageMetrics: React.FC = () => {
  const [rcCounter, setRcCounter] = useState<XcmCounter | null>(null);
  const [ahCounter, setAhCounter] = useState<XcmCounter | null>(null);
  const [dmpLatency, setDmpLatency] = useState<DmpLatency | null>(null);
  const [dmpQueueEvent, setDmpQueueEvent] = useState<DmpQueueEvent | null>(null);

  // Subscribe to RC and AH XCM message counter events
  const { error: xcmError } = useEventSource(['rcXcmMessageCounter', 'ahXcmMessageCounter'], useCallback((eventType: EventType, data: XcmCounter) => {
    if (eventType === 'rcXcmMessageCounter') {
      setRcCounter(data);
    } else if (eventType === 'ahXcmMessageCounter') {
      setAhCounter(data);
    }
  }, []));

  // Subscribe to DMP latency events
  const { error: latencyError } = useEventSource(['dmpLatency'], useCallback((eventType: EventType, data: DmpLatency) => {
    if (eventType === 'dmpLatency') {
      setDmpLatency(data);
    }
  }, []));

  // Subscribe to DMP queue events
  const { error: queueError } = useEventSource(['dmpQueueEvent'], useCallback((eventType: EventType, data: DmpQueueEvent) => {
    if (eventType === 'dmpQueueEvent') {
      setDmpQueueEvent(data);
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

  // Format latency for display
  const formatLatency = (latencyMs: number) => {
    if (latencyMs === 0) return '0s';
    return `${(latencyMs / 1000).toFixed(1)}s`;
  };

  // Get latency color based on value
  const getLatencyColor = (latencyMs: number) => {
    if (latencyMs < 5000) return 'var(--success)'; // < 5s = green
    if (latencyMs < 15000) return 'var(--warning)'; // 5-15s = yellow
    return 'var(--danger)'; // > 15s = red
  };

  // Format bytes for display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0KB';
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

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
      
      <div className="queue-sections">
        {/* DMP Queue Section */}
        <div className="queue-section">
          <div className="queue-section-header">
            <h3 className="queue-section-title">DMP Queue (Downward Message Passing)</h3>
            <div className="queue-section-status">
              <div className="queue-status status-excellent"></div>
              <span className="queue-section-throughput">Excellent</span>
            </div>
          </div>
          
          <div className="queue-section-metrics">
            <div className="queue-section-metric">
              <div className="queue-section-value">{dmpQueueEvent?.queueSize.toLocaleString() || 0}</div>
              <div className="queue-section-label">Current Depth</div>
            </div>
            <div className="queue-section-metric">
              <div className="queue-section-value">{formatBytes(dmpQueueEvent?.totalSizeBytes || 0)}</div>
              <div className="queue-section-label">Total Size</div>
            </div>
            <div className="queue-section-metric">
              <div className="queue-section-value" style={{ color: getLatencyColor(dmpLatency?.latencyMs || 0) }}>
                {formatLatency(dmpLatency?.latencyMs || 0)}
              </div>
              <div className="queue-section-label">Current Latency</div>
            </div>
            <div className="queue-section-metric">
              <div className="queue-section-value" style={{ color: getLatencyColor(dmpLatency?.averageLatencyMs || 0) }}>
                {formatLatency(dmpLatency?.averageLatencyMs || 0)}
              </div>
              <div className="queue-section-label">Avg Latency</div>
            </div>
          </div>
          
          <div className="queue-section-details">
            <div className="queue-section-trend trend-down">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L12 20M12 20L18 14M12 20L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Queue decreasing
            </div>
            <div className="queue-section-throughput">
              <span className="throughput-speed speed-fast">Fast</span> • 0 msg/min
            </div>
          </div>
        </div>
        
        {/* UMP Queue Section */}
        <div className="queue-section">
          <div className="queue-section-header">
            <h3 className="queue-section-title">UMP Queue (Upward Message Passing)</h3>
            <div className="queue-section-status">
              <div className="queue-status status-good"></div>
              <span className="queue-section-throughput">Good</span>
            </div>
          </div>
          
          <div className="queue-section-metrics">
            <div className="queue-section-metric">
              <div className="queue-section-value">0</div>
              <div className="queue-section-label">Current Depth</div>
            </div>
            <div className="queue-section-metric">
              <div className="queue-section-value">0</div>
              <div className="queue-section-label">Msg/min</div>
            </div>
            <div className="queue-section-metric">
              <div className="queue-section-value">0s</div>
              <div className="queue-section-label">Avg Processing</div>
            </div>
            <div className="queue-section-metric">
              <div className="queue-section-value">0KB</div>
              <div className="queue-section-label">Avg Size</div>
            </div>
          </div>
          
          <div className="queue-section-details">
            <div className="queue-section-trend trend-stable">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Queue stable
            </div>
            <div className="queue-section-throughput">
              <span className="throughput-speed speed-fast">Fast</span> • 0 msg/min
            </div>
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="chart-placeholder">
          XCM Message Queue Depth & Throughput Graph
        </div>
      </div>
    </section>
  );
};

export default XcmMessageMetrics; 