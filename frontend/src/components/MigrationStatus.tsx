import React, { useState, useCallback, useEffect } from 'react';
import { useEventSource } from '../hooks/useEventSource';
import type { EventType } from '../hooks/useEventSource';
import { MIGRATION_PALLETS } from '../constants/migrationPallets';
import './MigrationStatus.css';

interface MigrationStage {
  stage: string;
  details: any;
  blockNumber: number;
  blockHash: string;
  timestamp: string;
}

const MigrationStatus: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<MigrationStage | null>(null);
  const [completedPallets, setCompletedPallets] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Subscribe to RC migration stage updates
  const { error } = useEventSource(['rcStageUpdate'], useCallback((_eventType: EventType, data: MigrationStage) => {
    setCurrentStage(data);
    
    // Handle MigrationDone stage - mark all pallets as completed
    if (data.stage === 'MigrationDone') {
      setCompletedPallets([...MIGRATION_PALLETS]);
      return;
    }
    
    // Update completed pallets based on the stage
    // This is a simplified logic - you might want to enhance this based on your actual stage data
    const stageName = data.stage;
    const palletIndex = MIGRATION_PALLETS.findIndex(pallet => 
      stageName.toLowerCase().includes(pallet.toLowerCase())
    );
    
    if (palletIndex > 0) {
      // Mark all pallets up to the current one as completed
      const newCompleted = MIGRATION_PALLETS.slice(0, palletIndex);
      setCompletedPallets(newCompleted);
    }
  }, []));

  // Calculate which pallets to show in the carousel
  const getVisiblePallets = () => {
    const currentIndex = MIGRATION_PALLETS.findIndex(pallet => 
      currentStage?.stage.toLowerCase().includes(pallet.toLowerCase())
    );
    
    // If no current stage, show first few pallets
    if (currentIndex === -1) {
      return MIGRATION_PALLETS.slice(0, 6);
    }
    
    // Show current pallet and a few before/after
    const startIndex = Math.max(0, currentIndex - 2);
    const endIndex = Math.min(MIGRATION_PALLETS.length, currentIndex + 4);
    
    return MIGRATION_PALLETS.slice(startIndex, endIndex);
  };

  const visiblePallets = getVisiblePallets();
  const progressPercentage = completedPallets.length / MIGRATION_PALLETS.length * 100;

  return (
    <section className="card migration-status">
      <div className="card-header">
        <h2 className="card-title">Migration Status</h2>
        <div className="card-actions">
          {/* Icons for card actions would go here */}
        </div>
      </div>
      
      <div className="stage-display">
        <div className="stage-name">
          {currentStage ? currentStage.stage : 'Loading...'}
        </div>
        <div className="stage-description">
          {currentStage 
            ? currentStage.stage === 'MigrationDone'
              ? 'Migration completed successfully! All pallets have been migrated.'
              : `Currently migrating ${currentStage.stage} at block #${currentStage.blockNumber}`
            : 'Waiting for migration status updates'
          }
        </div>
      </div>
      
      <div className="progress-container">
        <div className="progress-header">
          <span className="progress-label">Overall Progress</span>
          <span className="progress-value">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="progress-explanation">
          <span className="explanation-text">(Percentage increases as migration stages complete)</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
      
      {/* Only show timeline and health indicators on desktop/tablet */}
      {!isMobile && (
        <>
          <div className="timeline">
            {visiblePallets.map((pallet, index) => {
              const isCompleted = completedPallets.includes(pallet);
              const isCurrent = currentStage?.stage.toLowerCase().includes(pallet.toLowerCase());
              
              return (
                <div key={pallet} className="timeline-point">
                  <div className={`point-marker ${isCompleted ? 'completed' : isCurrent ? 'ongoing' : ''}`}></div>
                  <div className="point-label">{pallet}</div>
                </div>
              );
            })}
          </div>
          
          <div className="health-indicators">
            <div className="health-indicator">
              <div className="indicator-dot dot-green"></div>
              <span className="indicator-label">Overall Status</span>
            </div>
            <div className="health-indicator">
              <div className="indicator-dot dot-yellow"></div>
              <span className="indicator-label">XCM Messages</span>
            </div>
            <div className="health-indicator">
              <div className="indicator-dot dot-green"></div>
              <span className="indicator-label">Balance Consistency</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default MigrationStatus; 