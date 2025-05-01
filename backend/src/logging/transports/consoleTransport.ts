import { format, transports } from 'winston';

import { getConfig } from '../../config';
import { nodeUtilFormat, stripTimestamp, timeStamp } from '../transformers';
import { ITransformableInfo } from '../types';

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
		level: getConfig().logLevel,
		handleExceptions: true,
		format: format.combine(...transformers),
		// Silence using `jest --silent`
		silent: process.env.NODE_ENV === 'test',
	});
}
