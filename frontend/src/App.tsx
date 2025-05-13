import React, { useEffect, useState } from 'react';
import RcMigrationStatus from './components/RcMigrationStatus';
import { AhMigrationStatus } from './components/AhMigrationStatus';
import { AhXcmCounter } from './components/AhXcmCounter';
import { RcXcmCounter } from './components/RcXcmCounter';
import './App.css';

function App() {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/rc-heads');

    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      if (data.connected) {
        setIsConnected(true);
      }
    });

    eventSource.addEventListener('newHead', (event) => {
      const data = JSON.parse(event.data);
      if (data.blockNumber) {
        setBlockNumber(data.blockNumber);
      }
    });

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
                Current Block Number: {blockNumber?.toLocaleString() ?? 'Waiting...'}
              </div>
            )}
            <RcMigrationStatus />
            <RcXcmCounter />
          </div>
          <div className="status-column">
            <AhMigrationStatus />
            <AhXcmCounter />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 