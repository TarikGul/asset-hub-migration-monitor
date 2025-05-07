import '@polkadot/api-augment';

import type { VoidFn } from '@polkadot/api/types';

import express, { Request, Response } from 'express';
import { runRelayChainService } from './services/rcService';
import { migrationStagesHandler } from './routes/migrationStages';

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


let cleanup: { unsubscribe: VoidFn; unsubscribeMigrationStage: VoidFn } | null = null;

runRelayChainService()
  .then((result) => {
    cleanup = result;
  })
  .catch(console.error);

// Handle termination signals
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const;
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    if (cleanup) {
      console.log('Cleaning up subscriptions...');
      cleanup.unsubscribe();
      cleanup.unsubscribeMigrationStage();
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
