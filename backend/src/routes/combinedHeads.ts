import { Request, Response } from 'express';
import { eventService } from '../services/eventService';

export const combinedHeadsHandler = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  // Set up event listeners for both chains
  const rcHeadListener = (data: any) => {
    res.write(`event: rcHead\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const ahHeadListener = (data: any) => {
    res.write(`event: ahHead\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Subscribe to both events
  eventService.on('rcHead', rcHeadListener);
  eventService.on('ahHead', ahHeadListener);

  // Handle client disconnect
  req.on('close', () => {
    eventService.off('rcHead', rcHeadListener);
    eventService.off('ahHead', ahHeadListener);
  });
}; 