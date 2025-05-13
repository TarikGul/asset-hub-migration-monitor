import React, { useEffect, useState } from 'react';
import './RcBalances.css';

interface BalanceData {
  kept: string;
  migrated: string;
}

export const RcBalances: React.FC = () => {
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/rc-balances');

    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      if (data.connected) {
        setIsConnected(true);
      }
    });

    eventSource.addEventListener('balances', (event) => {
      const data = JSON.parse(event.data);
      setBalances(data);
    });

    eventSource.addEventListener('error', (event) => {
      console.error('SSE Error:', event);
      setError('Failed to connect to balance updates');
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!isConnected) {
    return <div className="loading">Connecting to balance updates...</div>;
  }

  return (
    <div className="rc-balances">
      <h2>Relay Chain Balances</h2>
      <div className="balance-info">
        <div className="balance-details">
          <div className="balance-item">
            <span className="label">Kept Balance:</span>
            <span className="value">{balances?.kept ?? '0'}</span>
          </div>
          <div className="balance-item">
            <span className="label">Migrated Balance:</span>
            <span className="value">{balances?.migrated ?? '0'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 