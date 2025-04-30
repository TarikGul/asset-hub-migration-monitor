import dotenv from 'dotenv';
import { format, transports } from 'winston';

import { nodeUtilFormat, stripTimestamp, timeStamp } from '../transformers';
import { ITransformableInfo } from '../types';

// TODO: Add log level to config and environment variables
dotenv.config();

/**
 * Console transport for winston logger.
 */
export function consoleTransport(): transports.ConsoleTransportInstance {
	/**
	 * A simple printing format for how `ITransformableInfo` shows up.
	 */
	const simplePrint = format.printf((info) => {
		const typedInfo = info as ITransformableInfo;
		if (typedInfo?.stack) {
			// If there is a stack dump (e.g. error middleware), show that in console
			return `${typedInfo?.timestamp} ${typedInfo?.level}: ${typedInfo?.message} \n ${typedInfo?.stack}`;
		}

		return `${typedInfo?.timestamp} ${typedInfo?.level}: ${typedInfo?.message}`;
	});

	const transformers = [stripTimestamp(), nodeUtilFormat(), timeStamp];

	if (!process.env.LOG_JSON) {
		transformers.push(format.colorize(), simplePrint);
	} else {
		transformers.push(format.prettyPrint());
	}

	return new transports.Console({
		level: process.env.LOG_LEVEL || 'info',
		handleExceptions: true,
		format: format.combine(...transformers),
		// Silence using `jest --silent`
		silent: process.env.NODE_ENV === 'test',
	});
}
