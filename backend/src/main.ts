import '@polkadot/api-augment';

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
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Connected to:', {
    assetHub: getConfig().assetHubUrl,
    relayChain: getConfig().relayChainUrl,
  });
  runRelayChainService().catch(console.error);
});
