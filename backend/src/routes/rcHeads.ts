import { Request, Response } from 'express';
import { Log } from '../logging/Log';
import { eventService } from '../services/eventService';

const { logger } = Log;

export const rcHeadsHandler = (req: Request, res: Response) => {
  logger.info('New RC heads SSE connection established');

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial connection established event
  res.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  // Listen for new head events
  const handleNewHead = (data: { blockNumber: number }) => {
    res.write(`event: newHead\ndata: ${JSON.stringify(data)}\n\n`);
  };

  eventService.on('rcNewHead', handleNewHead);

  // Handle client disconnect
  req.on('close', () => {
    logger.info('RC heads SSE connection closed');
    eventService.off('rcNewHead', handleNewHead);
  });

  // Handle errors
  req.on('error', (error) => {
    logger.error('RC heads SSE connection error:', error);
    eventService.off('rcNewHead', handleNewHead);
    res.end();
  });
}; 