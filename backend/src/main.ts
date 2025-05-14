import '@polkadot/api-augment';

import type { VoidFn } from '@polkadot/api/types';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializeDb } from './db/initializeDb';
import { runRcHeadsService, runRcMigrationStageService, runRcXcmMessageCounterService, runRcBalancesService } from './services/rcService';
import { rcMigrationStagesHandler } from './routes/rcMigrationStages';
import { ahMigrationStagesHandler } from './routes/ahMigrationStages';
import { ahXcmCounterHandler } from './routes/ahXcmCounter';
import { eventService } from './services/eventService';
import { runAhMigrationStageService, runAhHeadsService, runAhXcmMessageCounterService } from './services/ahService';
import { Log } from './logging/Log';
import { rcXcmCounterHandler } from './routes/rcXcmCounter';
import { rcHeadsHandler } from './routes/rcHeads';
import { runRcFinalizedHeadsService } from './services/rcService';
import { ahHeadsHandler } from './routes/ahHeads';
import { runAhFinalizedHeadsService } from './services/ahService';
import { rcBalancesHandler } from './routes/rcBalances';
import { combinedHeadsHandler } from './routes/combinedHeads';

import { getConfig } from './config';

const { logger } = Log;

const app = express();
const port = getConfig().port;
const DISABLE_HEADS_SERVICE = true;

// Initialize the database
initializeDb()
  .then(() => {
    logger.info('Database initialized successfully');
  })
  .catch((err) => {
    logger.error('Error initializing database:', err);
  });

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

app.get('/api/rc-migration-stages', rcMigrationStagesHandler);
app.get('/api/ah-migration-stages', ahMigrationStagesHandler);
app.get('/api/ah-xcm-counter', ahXcmCounterHandler);
app.get('/api/rc-xcm-counter', rcXcmCounterHandler);
app.get('/api/rc-heads', rcHeadsHandler);
app.get('/api/ah-heads', ahHeadsHandler);
app.get('/api/rc-balances', rcBalancesHandler);
app.get('/api/combined-heads', combinedHeadsHandler);

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info('Connected to:', {
    assetHub: getConfig().assetHubUrl,
    relayChain: getConfig().relayChainUrl,
  });
});

let cleanupMigrationStage: VoidFn | null = null;
let cleanupHeads: VoidFn | null = null;
let cleanupAhMigrationStage: VoidFn | null = null;
let cleanupAhHeads: VoidFn | null = null;
let cleanupRcXcmMessageCounter: VoidFn | null = null;
let cleanupAhXcmMessageCounter: VoidFn | null = null;
let cleanupRcFinalizedHeads: VoidFn | null = null;
let cleanupAhFinalizedHeads: VoidFn | null = null;
let cleanupRcBalances: VoidFn | null = null;

// Start the RC finalized heads service
runRcFinalizedHeadsService()
  .then((result) => {
    cleanupRcFinalizedHeads = result;
  })
  .catch(err => logger.error(err));

runAhMigrationStageService()
  .then((result) => {
    cleanupAhMigrationStage = result;
  })
  .catch(err => logger.error(err));

// Start the migration stage service
runRcMigrationStageService()
  .then((result) => {
    cleanupMigrationStage = result;
  })
  .catch(err => logger.error(err));

runRcXcmMessageCounterService()
  .then((result) => {
    cleanupRcXcmMessageCounter = result;
  })
  .catch(err => logger.error(err));

runAhXcmMessageCounterService()
  .then((result) => {
    cleanupAhXcmMessageCounter = result;
  })
  .catch(err => logger.error(err));

// Start the AH finalized heads service
runAhFinalizedHeadsService()
  .then((result) => {
    cleanupAhFinalizedHeads = result;
  })
  .catch(err => logger.error(err));

// Start the RC balances service
runRcBalancesService()
  .then((result) => {
    cleanupRcBalances = result;
  })
  .catch(err => logger.error(err));

// Listen for the migrationScheduled event
eventService.on('migrationScheduled', async (data) => {
  logger.info('Migration scheduled event received:', data);
  
  if (DISABLE_HEADS_SERVICE) {
    logger.info('Heads service is disabled. Skipping...');
  } else {
    // Clean up existing heads subscription if it exists
    if (cleanupHeads) {
      logger.info('Cleaning up existing heads subscription...');
      cleanupHeads();
      cleanupHeads = null;
    }

    // Start new heads service with the scheduled block number
    try {
      cleanupHeads = await runRcHeadsService(data);
      cleanupAhHeads = await runAhHeadsService();
      logger.info(`Started monitoring heads for scheduled block #${data.scheduledBlockNumber}`);
    } catch (error) {
      logger.error('Error starting heads service:', error);
    }
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
    
    if (cleanupAhHeads) {
      logger.info('Cleaning up ah heads subscription...');
      cleanupAhHeads();
    }

    if (cleanupRcXcmMessageCounter) {
      logger.info('Cleaning up rc xcm message counter subscription...');
      cleanupRcXcmMessageCounter();
    }

    if (cleanupAhXcmMessageCounter) {
      logger.info('Cleaning up ah xcm message counter subscription...');
      cleanupAhXcmMessageCounter();
    }

    if (cleanupHeads) {
      logger.info('Cleaning up heads subscription...');
      cleanupHeads();
    } 

    if (cleanupAhFinalizedHeads) {
      logger.info('Cleaning up ah finalized heads subscription...');
      cleanupAhFinalizedHeads();
    }

    if (cleanupRcFinalizedHeads) {
      logger.info('Cleaning up rc finalized heads subscription...');
      cleanupRcFinalizedHeads();
    }

    if (cleanupRcBalances) {
      logger.info('Cleaning up rc balances subscription...');
      cleanupRcBalances();
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
