import '@polkadot/api-augment';

import type { VoidFn } from '@polkadot/api/types';

import express, { Request, Response } from 'express';
import { runRcHeadsService, runRcMigrationStageService } from './services/rcService';
import { migrationStagesHandler } from './routes/migrationStages';
import { eventService } from './services/eventService';

import { getConfig } from './config';

const app = express();
const port = getConfig().port;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/migration-stages', migrationStagesHandler);

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Connected to:', {
    assetHub: getConfig().assetHubUrl,
    relayChain: getConfig().relayChainUrl,
  });
});

let cleanupMigrationStage: VoidFn | null = null;
let cleanupHeads: VoidFn | null = null;

// Start the migration stage service
runRcMigrationStageService()
  .then((result) => {
    cleanupMigrationStage = result;
  })
  .catch(console.error);

// Listen for the migrationScheduled event
eventService.on('migrationScheduled', async (data) => {
  console.log('Migration scheduled event received:', data);
  
  // Clean up existing heads subscription if it exists
  if (cleanupHeads) {
    console.log('Cleaning up existing heads subscription...');
    cleanupHeads();
    cleanupHeads = null;
  }

  // Start new heads service with the scheduled block number
  try {
    cleanupHeads = await runRcHeadsService(data.scheduledBlock);
    console.log(`Started monitoring heads for scheduled block #${data.scheduledBlock}`);
  } catch (error) {
    console.error('Error starting heads service:', error);
  }
});

// Handle termination signals
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const;
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    if (cleanupMigrationStage) {
      console.log('Cleaning up migration stage subscription...');
      cleanupMigrationStage();
    }

    if (cleanupHeads) {
      console.log('Cleaning up heads subscription...');
      cleanupHeads();
    } 

    server.close(() => {
      console.log('Server closed. Exiting...');
      process.exit(0);
    });

    // Force exit after 5 seconds if cleanup takes too long
    setTimeout(() => {
      console.error('Forced exit after timeout');
      process.exit(1);
    }, 5000);
  });
});
