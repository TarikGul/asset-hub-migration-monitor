import React, { useEffect, useState } from 'react';
import RcMigrationStatus from './components/RcMigrationStatus';
import { AhMigrationStatus } from './components/AhMigrationStatus';
import { AhXcmCounter } from './components/AhXcmCounter';
import { RcXcmCounter } from './components/RcXcmCounter';
import './App.css';

function App() {
  const [rcBlockNumber, setRcBlockNumber] = useState<number | null>(null);
  const [rcIsConnected, setRcIsConnected] = useState(false);
  const [ahBlockNumber, setAhBlockNumber] = useState<number | null>(null);
  const [ahIsConnected, setAhIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/rc-heads');
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      if (data.connected) setRcIsConnected(true);
    });
    eventSource.addEventListener('newHead', (event) => {
      const data = JSON.parse(event.data);
      if (data.blockNumber) setRcBlockNumber(data.blockNumber);
    });
    return () => { eventSource.close(); };
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/ah-heads');
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      if (data.connected) setAhIsConnected(true);
    });
    eventSource.addEventListener('newHead', (event) => {
      const data = JSON.parse(event.data);
      if (data.blockNumber) setAhBlockNumber(data.blockNumber);
    });
    return () => { eventSource.close(); };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>AH Monitoring</h1>
      </header>
      <main className="app-main">
        <div className="migration-status-container">
          <div className="status-column">
            {rcIsConnected && (
              <div className="block-number-display">
                <span>RC Finalized Head:</span>
                <span className="number">{rcBlockNumber?.toLocaleString() ?? 'Waiting...'}</span>
              </div>
            )}
            <RcMigrationStatus />
            <RcXcmCounter />
          </div>
          <div className="status-column">
            {ahIsConnected && (
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