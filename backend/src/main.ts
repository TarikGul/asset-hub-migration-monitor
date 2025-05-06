import '@polkadot/api-augment';

import type { VoidFn } from '@polkadot/api/types';

import express, { Request, Response } from 'express';
import { runRelayChainService, migrationEvents } from './services/rcService';

import { getConfig } from './config';

const app = express();
const port = getConfig().port;

// Basic health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// SSE endpoint for migration stages
app.get('/api/migration-stages', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection message
  res.write('event: connected\ndata: connected\n\n');

  // Handle client disconnect
  req.on('close', () => {
    res.end();
  });

  // Send updates when migration stage changes
  const sendUpdate = (data: any) => {
    res.write(`event: stageUpdate\ndata: ${JSON.stringify(data)}\n\n`);
  };

  migrationEvents.on('stageUpdate', sendUpdate);

  // Cleanup on client disconnect
  req.on('close', () => {
    migrationEvents.off('stageUpdate', sendUpdate);
  });
});

// Start server
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
