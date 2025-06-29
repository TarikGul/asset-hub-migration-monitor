import { createLogger, Logger } from 'winston';
import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports';

import { consoleTransport, fileTransport } from './transports';
import { ServiceLogData, ChainEventLogData, DatabaseLogData, ConnectionLogData } from './types';

/**
 * Access a singleton winston.Logger that will be intialized on first use.
 */
export class Log {
  private static _transports: (ConsoleTransportInstance | FileTransportInstance)[] | undefined;
  private static _logger: Logger | undefined;
  private static create(): Logger {
    if (this._logger) {
      return this._logger;
    }

    this._transports = [
      consoleTransport(),
      fileTransport('info', 'combined.log'),
      fileTransport('error', 'errors.log'),
    ];

    this._logger = createLogger({
      transports: this._transports,
      exitOnError: false,
      exceptionHandlers: this._transports,
    });

    return this._logger;
  }

  static get logger(): Logger {
    return this._logger || this.create();
  }

  static service(data: ServiceLogData): void {
    const { service, action, details, error } = data;
    const message = `[${service}] ${action}`;

    if (error) {
      this.logger.error(message, { details, error: error.message, stack: error.stack });
    } else {
      this.logger.info(message, { details });
    }
  }

  static chainEvent(data: ChainEventLogData): void {
    const { chain, eventType, blockNumber, blockHash, details, error } = data;
    const message = `[${chain}] ${eventType}${blockNumber ? ` at block #${blockNumber}` : ''}`;

    if (error) {
      this.logger.error(message, { blockHash, details, error: error.message, stack: error.stack });
    } else {
      this.logger.info(message, { blockHash, details });
    }
  }

  static database(data: DatabaseLogData): void {
    const { operation, table, details, error } = data;
    const message = `[DB] ${operation} on ${table}`;

    if (error) {
      this.logger.error(message, { details, error: error.message, stack: error.stack });
    } else {
      this.logger.info(message, { details });
    }
  }

  static connection(data: ConnectionLogData): void {
    const { service, status, details, error } = data;
    const message = `[${service}] ${status}`;

    if (error) {
      this.logger.error(message, { details, error: error.message, stack: error.stack });
    } else {
      this.logger.info(message, { details });
    }
  }
}
