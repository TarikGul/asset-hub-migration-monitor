import { RequestHandler } from 'express';
import { eventService } from '../services/eventService';

export const migrationStagesHandler: RequestHandler = (req, res) => {
  console.log('New SSE connection established');
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    res.write('event: connected\ndata: connected\n\n');
  } catch (error) {
    console.error('Error sending initial connection message:', error);
    res.end();
    return;
  }

  req.on('close', () => {
    res.end();
  });

  const sendUpdate = (data: any) => {
    try {
      const eventData = `event: stageUpdate\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(eventData);
    } catch (error) {
      console.error('Error sending update:', error);
    }
  };

  eventService.on('stageUpdate', sendUpdate);

  req.on('close', () => {
    eventService.off('stageUpdate', sendUpdate);
  });
}; 