import { Request, Response } from 'express';
import { Log } from '../logging/Log';
import { eventService } from '../services/eventService';

const { logger } = Log;

export const rcBalancesHandler = (req: Request, res: Response) => {
  logger.info('New RC balances SSE connection established');

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial connection established event
  res.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  // Listen for balance updates
  const handleBalances = (data: { kept: string; migrated: string }) => {
    res.write(`event: balances\ndata: ${JSON.stringify(data)}\n\n`);
  };

  eventService.on('rcBalances', handleBalances);

  // Handle client disconnect
  req.on('close', () => {
    logger.info('RC balances SSE connection closed');
    eventService.off('rcBalances', handleBalances);
  });

  // Handle errors
  req.on('error', (error) => {
    logger.error('RC balances SSE connection error:', error);
    eventService.off('rcBalances', handleBalances);
    res.end();
  });
}; 