import React, { useState, useCallback } from 'react';
import { useEventSource } from '../hooks/useEventSource';
import type { EventType } from '../hooks/useEventSource';
import './RcBalances.css';

interface BalanceData {
  kept: string;
  migrated: string;
}

export const RcBalances: React.FC = () => {
  const [balances, setBalances] = useState<BalanceData | null>(null);
  
  const handleEvent = useCallback((_eventType: EventType, data: BalanceData) => {
    setBalances(data);
  }, []);

  const { isConnected, error } = useEventSource(['rcBalances'], handleEvent);

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