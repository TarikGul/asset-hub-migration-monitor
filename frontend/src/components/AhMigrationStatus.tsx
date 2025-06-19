import React, { useState, useCallback } from 'react';
import { useEventSource } from '../hooks/useEventSource';
import type { EventType } from '../hooks/useEventSource';
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
  
  const handleEvent = useCallback((_eventType: EventType, data: MigrationStage) => {
    setCurrentStage(data);
  }, []);

  const { error } = useEventSource(['ahStageUpdate'], handleEvent);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!currentStage) {
    return <div className="loading">Waiting for migration status updates...</div>;
  }

  return (
    <div className="migration-status">
      <h2>Asset Hub</h2>
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