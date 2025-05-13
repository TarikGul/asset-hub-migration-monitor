import { RequestHandler } from 'express';
import { eventService } from '../services/eventService';
import { db } from '../db';
import { migrationStages } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import { Log } from '../logging/Log';

export const rcMigrationStagesHandler: RequestHandler = async (req, res) => {
  const { logger } = Log;
  logger.info('New SSE connection established');
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Get the latest migration stage from the database
    const latestStage = await db.query.migrationStages.findFirst({
      where: eq(migrationStages.chain, 'relay-chain'),
      orderBy: [desc(migrationStages.timestamp)],
    });

    const initialData = {
      type: 'connected',
      latestStage: latestStage ? {
        stage: latestStage.stage,
        details: latestStage.details ? JSON.parse(latestStage.details) : null,
        blockNumber: latestStage.blockNumber,
        blockHash: latestStage.blockHash,
        timestamp: latestStage.timestamp,
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
      const eventData = `event: rcStageUpdate\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(eventData);
    } catch (error) {
      logger.error('Error sending update:', error);
    }
  };

  eventService.on('rcStageUpdate', sendUpdate);

  req.on('close', () => {
    eventService.off('rcStageUpdate', sendUpdate);
  });
}; 