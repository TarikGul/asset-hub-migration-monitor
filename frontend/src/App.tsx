import React from 'react';
import MigrationStatus from './components/MigrationStatus';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>AH Monitoring</h1>
      </header>
      <main className="app-main">
        <MigrationStatus />
      </main>
    </div>
  );
};

export default App; 