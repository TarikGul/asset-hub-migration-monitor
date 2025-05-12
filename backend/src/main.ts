import '@polkadot/api-augment';

import type { VoidFn } from '@polkadot/api/types';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { runRcHeadsService, runRcMigrationStageService } from './services/rcService';
import { migrationStagesHandler } from './routes/migrationStages';
import { eventService } from './services/eventService';
import { Log } from './logging/Log';

import { getConfig } from './config';

const { logger } = Log;

const app = express();
const port = getConfig().port;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/migration-stages', migrationStagesHandler);

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info('Connected to:', {
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
  .catch(err => logger.error(err));

// Listen for the migrationScheduled event
eventService.on('migrationScheduled', async (data) => {
  logger.info('Migration scheduled event received:', data);
  
  // Clean up existing heads subscription if it exists
  if (cleanupHeads) {
    logger.info('Cleaning up existing heads subscription...');
    cleanupHeads();
    cleanupHeads = null;
  }

  // Start new heads service with the scheduled block number
  try {
    cleanupHeads = await runRcHeadsService(data.scheduledBlock);
    logger.info(`Started monitoring heads for scheduled block #${data.scheduledBlock}`);
  } catch (error) {
    logger.error('Error starting heads service:', error);
  }
});

// Handle termination signals
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const;
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);

    if (cleanupMigrationStage) {
      logger.info('Cleaning up migration stage subscription...');
      cleanupMigrationStage();
    }

    if (cleanupHeads) {
      logger.info('Cleaning up heads subscription...');
      cleanupHeads();
    } 

    server.close(() => {
      logger.info('Server closed. Exiting...');
      process.exit(0);
    });

    // Force exit after 5 seconds if cleanup takes too long
    setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, 5000);
  });
});
