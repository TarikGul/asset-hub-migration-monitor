import { format, transports } from 'winston';

import { getConfig } from '../../config';
import { stripTimestamp, timeStamp } from '../transformers';
import { ITransformableInfo } from '../types';

/**
 * Console transport for winston logger.
 */
export function consoleTransport(): transports.ConsoleTransportInstance {
  /**
   * A simple printing format for how `ITransformableInfo` shows up.
   */
  const simplePrint = format.printf(info => {
    const typedInfo = info as ITransformableInfo;
    if (typedInfo?.stack) {
      // If there is a stack dump (e.g. error middleware), show that in console
      return `${typedInfo?.timestamp} ${typedInfo?.level}: ${typedInfo?.message} \n ${typedInfo?.stack}`;
    }

    // Include details on the same line if they exist
    let output = `${typedInfo?.timestamp} ${typedInfo?.level}: ${typedInfo?.message}`;

    // Add details if they exist (from our standardized logging)
    if (typedInfo?.details) {
      output += ` | ${JSON.stringify(typedInfo.details)}`;
    }

    // Add error message if it exists (from our standardized logging)
    if (typedInfo?.error) {
      output += ` | Error: ${typedInfo.error}`;
    }

    return output;
  });

  const transformers = [stripTimestamp(), timeStamp];

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
