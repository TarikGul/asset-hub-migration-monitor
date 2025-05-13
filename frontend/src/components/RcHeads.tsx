import React, { useEffect, useState } from 'react';
import './RcHeads.css';

export const RcHeads: React.FC = () => {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/rc-heads');

    eventSource.onopen = () => {
      console.log('RC heads SSE connection opened');
    };

    eventSource.addEventListener('connected', (event) => {
      console.log('RC heads SSE connected event received:', event);
      const data = JSON.parse(event.data);
      if (data.connected) {
        setIsConnected(true);
        setError(null);
      }
    });

    eventSource.addEventListener('newHead', (event) => {
      console.log('RC heads SSE newHead event received:', event);
      const data = JSON.parse(event.data);
      if (data.blockNumber) {
        setBlockNumber(data.blockNumber);
        setError(null);
      }
    });

    eventSource.onerror = (error) => {
      console.error('RC heads SSE connection error:', error);
      setError('Failed to connect to RC heads stream');
      setIsConnected(false);
    };

    return () => {
      console.log('Cleaning up RC heads SSE connection');
      eventSource.close();
    };
  }, []);

  if (error) {
    return <div className="rc-heads error-message">{error}</div>;
  }

  if (!isConnected) {
    return <div className="rc-heads loading">Connecting to RC heads stream...</div>;
  }

  return (
    <div className="rc-heads">
      <h2>Relay Chain Finalized Head</h2>
      <div className="block-info">
        <div className="block-details">
          <div>
            {blockNumber ? `Block #${blockNumber.toLocaleString()}` : 'Waiting for block...'}
          </div>
        </div>
      </div>
    </div>
  );
}; 