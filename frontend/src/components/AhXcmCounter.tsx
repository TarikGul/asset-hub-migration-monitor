import React, { useEffect, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isConnected) return;

    const sse = new EventSource('http://localhost:8080/api/ah-xcm-counter');
    console.log('Setting up SSE connection for AH XCM counter...');
    setIsConnected(true);

    // Handle the initial connection event
    sse.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received connected event for AH XCM counter:', data);
        if (data.latestCounter) {
          setCounter(data.latestCounter);
        }
      } catch (err) {
        console.error('Error parsing connected event for AH XCM counter:', err);
      }
    });

    // Handle counter updates
    sse.addEventListener('ahXcmMessageCounter', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received counter update for AH:', data);
        setCounter(data);
      } catch (err) {
        console.error('Error parsing counter update for AH:', err);
      }
    });

    // Handle general messages as fallback
    sse.onmessage = (event) => {
      console.log('Received general message for AH XCM counter:', event.data);
    };

    sse.onerror = (err) => {
      console.error('SSE Error for AH XCM counter:', err);
      setError('Error connecting to XCM counter');
      sse.close();
      setIsConnected(false);
    };

    return () => {
      console.log('Cleaning up SSE connection for AH XCM counter...');
      sse.close();
      setIsConnected(false);
    };
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!counter) {
    return <div className="loading">Waiting for XCM counter updates...</div>;
  }

  return (
    <div className="migration-status">
      <h2>XCM Message Counter</h2>
      <div className="stage-info">
        <div className="counter-details">
          <div>Messages Sent: {counter.messagesSent}</div>
          <div>Messages Processed: {counter.messagesProcessed}</div>
          <div>Messages Failed: {counter.messagesFailed}</div>
          <div>Last Updated: {new Date(counter.lastUpdated).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}; 