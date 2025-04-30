import { createLogger, Logger } from 'winston';
import {
	ConsoleTransportInstance,
	FileTransportInstance,
} from 'winston/lib/winston/transports';

import { consoleTransport, fileTransport } from './transports';

/**
 * Access a singleton winston.Logger that will be intialized on first use.
 */
export class Log {
	private static _transports:
		| (ConsoleTransportInstance | FileTransportInstance)[]
		| undefined;
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
}
