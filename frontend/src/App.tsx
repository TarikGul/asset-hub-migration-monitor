import React, { useEffect, useState } from 'react';
import RcMigrationStatus from './components/RcMigrationStatus';
import { AhMigrationStatus } from './components/AhMigrationStatus';
import { AhXcmCounter } from './components/AhXcmCounter';
import { RcXcmCounter } from './components/RcXcmCounter';
import { RcBalances } from './components/RcBalances';
import './App.css';

function App() {
  const [rcBlockNumber, setRcBlockNumber] = useState<number | null>(null);
  const [ahBlockNumber, setAhBlockNumber] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/combined-heads');
    
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      if (data.connected) setIsConnected(true);
    });

    eventSource.addEventListener('rcHead', (event) => {
      const data = JSON.parse(event.data);
      if (data.blockNumber) setRcBlockNumber(data.blockNumber);
    });

    eventSource.addEventListener('ahHead', (event) => {
      const data = JSON.parse(event.data);
      if (data.blockNumber) setAhBlockNumber(data.blockNumber);
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

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