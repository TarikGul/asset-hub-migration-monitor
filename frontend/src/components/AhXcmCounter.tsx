import React, { useState, useCallback } from 'react';
import { useEventSource } from '../hooks/useEventSource';
import type { EventType } from '../hooks/useEventSource';
import './AhXcmCounter.css';

interface XcmCounter {
  sourceChain: string;
  destinationChain: string;
  messagesSent: number;
  messagesProcessed: number;
  messagesFailed: number;
  lastUpdated: string;
}

export const AhXcmCounter: React.FC = () => {
  const [counter, setCounter] = useState<XcmCounter | null>(null);
  
  const handleEvent = useCallback((_eventType: EventType, data: XcmCounter) => {
    setCounter(data);
  }, []);

  const { error } = useEventSource(['ahXcmMessageCounter'], handleEvent);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!counter) {
    return <div className="loading">Waiting for XCM counter updates...</div>;
  }

  return (
    <div className="migration-status">
      <h2>AH XCM Message Counter</h2>
      <div className="stage-info">
        <div className="counter-details">
          <div>Messages Processed: {counter.messagesProcessed}</div>
          <div>Messages Failed: {counter.messagesFailed}</div>
          <div>Last Updated: {new Date(counter.lastUpdated).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}; 