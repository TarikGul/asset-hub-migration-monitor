import React, { useState, useCallback } from 'react';
import MigrationStatus from './components/MigrationStatus';
import PerPalletMigrationStatus from './components/PerPalletMigrationStatus';
import XcmMessageMetrics from './components/XcmMessageMetrics';
import BackendUrlInput from './components/BackendUrlInput';
import { useEventSource, useBackendUrl } from './hooks/useEventSource';
import type { EventType } from './hooks/useEventSource';
import './App.css';
import polkadotLogo from './assets/Polkadot_Token_Pink.png';

function App() {
  const [rcBlockNumber, setRcBlockNumber] = useState<number | null>(null);
  const [ahBlockNumber, setAhBlockNumber] = useState<number | null>(null);

  const { backendUrl, setBackendUrl, isConnected } = useBackendUrl();

  const handleEvent = useCallback((eventType: EventType, data: any) => {
    if (eventType === 'rcHead' && data.blockNumber) {
      setRcBlockNumber(data.blockNumber);
    } else if (eventType === 'ahHead' && data.blockNumber) {
      setAhBlockNumber(data.blockNumber);
    }
  }, []);

  useEventSource(['rcHead', 'ahHead'], handleEvent);

  const handleBackendUrlChange = useCallback((url: string) => {
    setBackendUrl(url);
  }, [setBackendUrl]);

  return (
    <div className="app">
      <header>
        <div className="logo">
          <img src={polkadotLogo} alt="Polkadot Logo" />
          <h1>Asset Hub Migration Monitor</h1>
        </div>
        <div className="header-info">
          <BackendUrlInput
            currentUrl={backendUrl}
            onUrlChange={handleBackendUrlChange}
            isConnected={isConnected}
          />
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
        <PerPalletMigrationStatus />
        <XcmMessageMetrics />
      </main>
    </div>
  );
}

export default App; 