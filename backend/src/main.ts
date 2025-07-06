import '@polkadot/api-augment';

import type { VoidFn } from '@polkadot/api/types';

import cors from 'cors';
import express, { Request, Response } from 'express';

import { getConfig } from './config';
import { initializeDb } from './db/initializeDb';
import { Log } from './logging/Log';
import { updatesHandler } from './routes/updates';
import { SubscriptionManager } from './util/SubscriptionManager';

const app = express();
const port = getConfig().port;

// Initialize the database
initializeDb()
  .then(() => {
    Log.service({
      service: 'Database',
      action: 'Initialized successfully',
    });
  })
  .catch(err => {
    Log.service({
      service: 'Database',
      action: 'Initialization error',
      error: err as Error,
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


const main = async () => {
  const subManager = SubscriptionManager.getInstance();

  subManager.initRcPreMigrationService();
  subManager.checkCurrentMigrationStageInDB();

  // Handle termination signals
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const;
  signals.forEach(signal => {
    process.on(signal, async () => {
      Log.service({
        service: 'Application',
        action: 'Received termination signal, starting graceful shutdown',
        details: { signal },
      });

      subManager.cleanupAllSubs();


      server.close(() => {
        Log.service({
          service: 'Application',
          action: 'Server closed, exiting',
        });
        process.exit(0);
      });

      // Force exit after 5 seconds if cleanup takes too long
      setTimeout(() => {
        Log.service({
          service: 'Application',
          action: 'Forced exit after timeout',
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
        relayChain: getConfig().relayChainUrl,
      },
    });
  });
}

try {
  main()
} catch(err) {
  console.error(err);
}
