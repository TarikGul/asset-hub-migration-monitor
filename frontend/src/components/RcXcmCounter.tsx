import React, { useState, useCallback } from 'react';
import { useEventSource } from '../hooks/useEventSource';
import type { EventType } from '../hooks/useEventSource';
import './RcXcmCounter.css';

interface XcmCounter {
  sourceChain: string;
  destinationChain: string;
  messagesSent: number;
  messagesProcessed: number;
  messagesFailed: number;
  lastUpdated: string;
}

export const RcXcmCounter: React.FC = () => {
  const [counter, setCounter] = useState<XcmCounter | null>(null);
  
  const handleEvent = useCallback((_eventType: EventType, data: XcmCounter) => {
    setCounter(data);
  }, []);

  const { error } = useEventSource(['rcXcmMessageCounter'], handleEvent);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!counter) {
    return <div className="loading">Waiting for XCM counter updates...</div>;
  }

  return (
    <div className="migration-status">
      <h2>RC XCM Message Counter</h2>
      <div className="stage-info">
        <div className="counter-details">
          <div>Messages Sent: {counter.messagesSent}</div>
          <div>Last Updated: {new Date(counter.lastUpdated).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}; 