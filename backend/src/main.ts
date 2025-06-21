import '@polkadot/api-augment';

import type { VoidFn } from '@polkadot/api/types';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializeDb } from './db/initializeDb';
import { runRcHeadsService, runRcMigrationStageService, runRcXcmMessageCounterService, runRcBalancesService, runRcDmpDataMessageCountsService } from './services/rcService';
import { eventService } from './services/eventService';
import { runAhMigrationStageService, runAhHeadsService, runAhXcmMessageCounterService } from './services/ahService';
import { Log } from './logging/Log';
import { runRcFinalizedHeadsService } from './services/rcService';
import { runAhFinalizedHeadsService } from './services/ahService';
import { updatesHandler } from './routes/updates';

import { getConfig } from './config';

const app = express();
const port = getConfig().port;
const DISABLE_HEADS_SERVICE = true;

// Initialize the database
initializeDb()
  .then(() => {
    Log.service({
      service: 'Database',
      action: 'Initialized successfully'
    });
  })
  .catch((err) => {
    Log.service({
      service: 'Database',
      action: 'Initialization error',
      error: err as Error
    });
  });

// Enable CORS
app.use(cors());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Consolidated SSE endpoint
app.get('/api/updates', updatesHandler);

let cleanupMigrationStage: VoidFn | null = null;
let cleanupHeads: VoidFn | null = null;
let cleanupAhMigrationStage: VoidFn | null = null;
let cleanupAhHeads: VoidFn | null = null;
let cleanupRcXcmMessageCounter: VoidFn | null = null;
let cleanupAhXcmMessageCounter: VoidFn | null = null;
let cleanupRcFinalizedHeads: VoidFn | null = null;
let cleanupAhFinalizedHeads: VoidFn | null = null;
let cleanupRcBalances: VoidFn | null = null;
let cleanupRcDmpDataMessageCounts: VoidFn | null = null;

// Start the RC finalized heads service
runRcFinalizedHeadsService()
  .then((result) => {
    cleanupRcFinalizedHeads = result;
  })
  .catch(err => Log.service({
    service: 'RC Finalized Heads',
    action: 'Service start error',
    error: err as Error
  }));

runAhMigrationStageService()
  .then((result) => {
    cleanupAhMigrationStage = result;
  })
  .catch(err => Log.service({
    service: 'AH Migration Stage',
    action: 'Service start error',
    error: err as Error
  }));

// Start the migration stage service
runRcMigrationStageService()
  .then((result) => {
    cleanupMigrationStage = result;
  })
  .catch(err => Log.service({
    service: 'RC Migration Stage',
    action: 'Service start error',
    error: err as Error
  }));

runRcXcmMessageCounterService()
  .then((result) => {
    cleanupRcXcmMessageCounter = result;
  })
  .catch(err => Log.service({
    service: 'RC XCM Message Counter',
    action: 'Service start error',
    error: err as Error
  }));

runAhXcmMessageCounterService()
  .then((result) => {
    cleanupAhXcmMessageCounter = result;
  })
  .catch(err => Log.service({
    service: 'AH XCM Message Counter',
    action: 'Service start error',
    error: err as Error
  }));

// Start the AH finalized heads service
runAhFinalizedHeadsService()
  .then((result) => {
    cleanupAhFinalizedHeads = result;
  })
  .catch(err => Log.service({
    service: 'AH Finalized Heads',
    action: 'Service start error',
    error: err as Error
  }));

// Start the RC balances service
runRcBalancesService()
  .then((result) => {
    cleanupRcBalances = result;
  })
  .catch(err => Log.service({
    service: 'RC Balances',
    action: 'Service start error',
    error: err as Error
  }));

runRcDmpDataMessageCountsService()
  .then((result) => {
    cleanupRcDmpDataMessageCounts = result;
  })
  .catch(err => Log.service({
    service: 'RC DMP Data Message Counts',
    action: 'Service start error',
    error: err as Error
  }));

// Listen for the migrationScheduled event
eventService.on('migrationScheduled', async (data) => {
  Log.service({
    service: 'Migration Scheduler',
    action: 'Migration scheduled event received',
    details: data
  });
  
  if (DISABLE_HEADS_SERVICE) {
    Log.service({
      service: 'Migration Scheduler',
      action: 'Heads service disabled, skipping'
    });
  } else {
    // Clean up existing heads subscription if it exists
    if (cleanupHeads) {
      Log.service({
        service: 'Migration Scheduler',
        action: 'Cleaning up existing heads subscription'
      });
      cleanupHeads();
      cleanupHeads = null;
    }

    // Start new heads service with the scheduled block number
    try {
      cleanupHeads = await runRcHeadsService(data);
      cleanupAhHeads = await runAhHeadsService();
      Log.service({
        service: 'Migration Scheduler',
        action: 'Started monitoring heads for scheduled block',
        details: { scheduledBlockNumber: data.scheduledBlockNumber }
      });
    } catch (error) {
      Log.service({
        service: 'Migration Scheduler',
        action: 'Error starting heads service',
        error: error as Error
      });
    }
  }
});

// Handle termination signals
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const;
signals.forEach((signal) => {
  process.on(signal, async () => {
    Log.service({
      service: 'Application',
      action: 'Received termination signal, starting graceful shutdown',
      details: { signal }
    });

    if (cleanupMigrationStage) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up migration stage subscription'
      });
      cleanupMigrationStage();
    }
    
    if (cleanupAhHeads) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up AH heads subscription'
      });
      cleanupAhHeads();
    }

    if (cleanupRcXcmMessageCounter) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up RC XCM message counter subscription'
      });
      cleanupRcXcmMessageCounter();
    }

    if (cleanupAhXcmMessageCounter) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up AH XCM message counter subscription'
      });
      cleanupAhXcmMessageCounter();
    }

    if (cleanupHeads) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up heads subscription'
      });
      cleanupHeads();
    } 

    if (cleanupAhFinalizedHeads) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up AH finalized heads subscription'
      });
      cleanupAhFinalizedHeads();
    }

    if (cleanupRcFinalizedHeads) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up RC finalized heads subscription'
      });
      cleanupRcFinalizedHeads();
    }

    if (cleanupRcBalances) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up RC balances subscription'
      });
      cleanupRcBalances();
    }

    if (cleanupRcDmpDataMessageCounts) {
      Log.service({
        service: 'Application',
        action: 'Cleaning up RC DMP data message counts subscription'
      });
      cleanupRcDmpDataMessageCounts();
    }

    server.close(() => {
      Log.service({
        service: 'Application',
        action: 'Server closed, exiting'
      });
      process.exit(0);
    });

    // Force exit after 5 seconds if cleanup takes too long
    setTimeout(() => {
      Log.service({
        service: 'Application',
        action: 'Forced exit after timeout'
      });
      process.exit(1);
    }, 5000);
  });
});

const server = app.listen(port, () => {
  Log.service({
    service: 'Application',
    action: 'Server started',
    details: { 
      port,
      assetHub: getConfig().assetHubUrl,
      relayChain: getConfig().relayChainUrl
    }
  });
});
