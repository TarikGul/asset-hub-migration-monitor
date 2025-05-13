import React from 'react';
import RcMigrationStatus from './components/RcMigrationStatus';
import { AhMigrationStatus } from './components/AhMigrationStatus';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>AH Monitoring</h1>
      </header>
      <main className="app-main">
        <div className="migration-status-container">
          <RcMigrationStatus />
          <AhMigrationStatus />
        </div>
      </main>
    </div>
  );
}

export default App; 