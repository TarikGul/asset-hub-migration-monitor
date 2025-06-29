import { TransformableInfo } from 'logform';

/**
 * The logform package exports `TransformableInfo` but it sets the
 * message type to `any`. Here we take that exact type and recreate it
 * to have more specific type info.
 */
export interface ITransformableInfo extends TransformableInfo {
  message: string;
}

export type ISanitizedData = {
  [key: string]: unknown;
};

// Standardized log message structures
export interface ServiceLogData {
  service: string;
  action: string;
  details?: Record<string, unknown>;
  error?: Error;
}

export interface ChainEventLogData {
  chain: 'relay-chain' | 'asset-hub';
  eventType: string;
  blockNumber?: number;
  blockHash?: string;
  details?: Record<string, unknown>;
  error?: Error;
}

export interface DatabaseLogData {
  operation: 'insert' | 'update' | 'query' | 'delete';
  table: string;
  details?: Record<string, unknown>;
  error?: Error;
}

export interface ConnectionLogData {
  service: string;
  status: 'connected' | 'disconnected' | 'error';
  details?: Record<string, unknown>;
  error?: Error;
}
