import React, { useState, useCallback } from 'react';
import RcMigrationStatus from './components/RcMigrationStatus';
import { AhMigrationStatus } from './components/AhMigrationStatus';
import { AhXcmCounter } from './components/AhXcmCounter';
import { RcXcmCounter } from './components/RcXcmCounter';
import { RcBalances } from './components/RcBalances';
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
      <header className="app-header">
        <h1>AH Monitoring</h1>
      </header>
      <main className="app-main">
        <div className="migration-status-container">
          <div className="status-column">
            {isConnected && (
              <div className="block-number-display">
                <span>RC Finalized Head:</span>
                <span className="number">{rcBlockNumber?.toLocaleString() ?? 'Waiting...'}</span>
              </div>
            )}
            <RcMigrationStatus />
            <RcXcmCounter />
            <RcBalances />
          </div>
          <div className="status-column">
            {isConnected && (
              <div className="block-number-display">
                <span>AH Finalized Head:</span>
                <span className="number">{ahBlockNumber?.toLocaleString() ?? 'Waiting...'}</span>
              </div>
            )}
            <AhMigrationStatus />
            <AhXcmCounter />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 