import React, { useEffect, useState } from 'react';
import './AhMigrationStatus.css';

interface MigrationStage {
  stage: string;
  details: any;
  blockNumber: number;
  blockHash: string;
  timestamp: string;
  chain: string;
}

export const AhMigrationStatus: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<MigrationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isConnected) return;

    const sse = new EventSource('http://localhost:8080/api/ah-migration-stages');
    console.log('Setting up SSE connection for AH...');
    setIsConnected(true);

    // Handle the initial connection event
    sse.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received connected event for AH:', data);
        if (data.latestStage) {
          setCurrentStage(data.latestStage);
        }
      } catch (err) {
        console.error('Error parsing connected event for AH:', err);
      }
    });

    // Handle stage updates
    sse.addEventListener('ahStageUpdate', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received stage update for AH:', data);
        setCurrentStage(data);
      } catch (err) {
        console.error('Error parsing stage update for AH:', err);
      }
    });

    // Handle general messages as fallback
    sse.onmessage = (event) => {
      console.log('Received general message for AH:', event.data);
    };

    sse.onerror = (err) => {
      console.error('SSE Error for AH:', err);
      setError('Error connecting to migration stages');
      sse.close();
      setIsConnected(false);
    };

    return () => {
      console.log('Cleaning up SSE connection for AH...');
      sse.close();
      setIsConnected(false);
    };
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!currentStage) {
    return <div className="loading">Waiting for migration status updates...</div>;
  }

  return (
    <div className="migration-status">
      <h2>Migration Status</h2>
      <div className="stage-info">
        <div className="stage-name">{currentStage.stage}</div>
        <div className="stage-details">
          <div>Block: #{currentStage.blockNumber}</div>
          <div>Hash: {currentStage.blockHash}</div>
          <div>Time: {currentStage.timestamp ? new Date(currentStage.timestamp).toLocaleString() : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}; 