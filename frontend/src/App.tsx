import React from 'react';

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Asset Hub Migration Monitor</h1>
      </header>
      <main className="app-main">
        <div className="migration-status">
          <h2>Migration Status</h2>
          {/* Migration status content will go here */}
        </div>
      </main>
    </div>
  );
};

export default App; 