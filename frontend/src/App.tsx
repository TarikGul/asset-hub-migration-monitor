import React, { useState, useCallback } from 'react';
import MigrationStatus from './components/MigrationStatus';
import XcmMessageMetrics from './components/XcmMessageMetrics';
import { useEventSource } from './hooks/useEventSource';
import type { EventType } from './hooks/useEventSource';
import './App.css';

function App() {
  const [rcBlockNumber, setRcBlockNumber] = useState<number | null>(null);
  const [ahBlockNumber, setAhBlockNumber] = useState<number | null>(null);

  const handleEvent = useCallback((eventType: EventType, data: any) => {
    if (eventType === 'rcHead' && data.blockNumber) {
      setRcBlockNumber(data.blockNumber);
    } else if (eventType === 'ahHead' && data.blockNumber) {
      setAhBlockNumber(data.blockNumber);
    }
  }, []);

  const { isConnected } = useEventSource(['rcHead', 'ahHead'], handleEvent);

  return (
    <div className="app">
      <header>
        <div className="logo">
          <img src="https://polkadot.network/assets/img/logo-polkadot.svg" alt="Polkadot Logo" />
          <h1>Asset Hub Migration Monitor</h1>
        </div>
        <div className="header-info">
          <span className="timestamp">Last updated: {new Date().toLocaleString()}</span>
          <div className="finalized-heads">
            <div className="head-display">
              <div className="head-status"></div>
              <span className="head-label">RC Finalized:</span>
              <span className="head-value">{rcBlockNumber?.toLocaleString() ?? 'Waiting...'}</span>
            </div>
            <div className="head-display">
              <div className="head-status"></div>
              <span className="head-label">AH Finalized:</span>
              <span className="head-value">{ahBlockNumber?.toLocaleString() ?? 'Waiting...'}</span>
            </div>
          </div>
        </div>
      </header>
      <main>
        <MigrationStatus />
        <XcmMessageMetrics />
      </main>
    </div>
  );
}

export default App; 