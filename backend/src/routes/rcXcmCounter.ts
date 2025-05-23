import { RequestHandler } from 'express';
import { eventService } from '../services/eventService';
import { db } from '../db';
import { Log } from '../logging/Log';

export const rcXcmCounterHandler: RequestHandler = async (req, res) => {
  const { logger } = Log;
  logger.info('New SSE connection established for RC XCM counter');
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Get the latest counter from the database
    const latestCounter = await db.query.xcmMessageCounters.findFirst({
      where: (counters, { and, eq }) => and(
        eq(counters.sourceChain, 'relay-chain'),
        eq(counters.destinationChain, 'asset-hub')
      ),
    });

    const initialData = {
      type: 'connected',
      latestCounter: latestCounter ? {
        sourceChain: latestCounter.sourceChain,
        destinationChain: latestCounter.destinationChain,
        messagesSent: latestCounter.messagesSent,
        messagesProcessed: latestCounter.messagesProcessed,
        messagesFailed: latestCounter.messagesFailed,
        lastUpdated: latestCounter.lastUpdated,
      } : null,
    };

    res.write(`event: connected\ndata: ${JSON.stringify(initialData)}\n\n`);
  } catch (error) {
    logger.error('Error sending initial connection message:', error);
    res.end();
    return;
  }

  req.on('close', () => {
    res.end();
  });

  const sendUpdate = (data: any) => {
    try {
      const eventData = `event: rcXcmMessageCounter\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(eventData);
    } catch (error) {
      logger.error('Error sending update:', error);
    }
  };

  eventService.on('rcXcmMessageCounter', sendUpdate);

  req.on('close', () => {
    eventService.off('rcXcmMessageCounter', sendUpdate);
  });
}; 