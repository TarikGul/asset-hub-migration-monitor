import { SPLAT } from 'triple-beam';
import { format } from 'util';
import * as winston from 'winston';

import { ITransformableInfo } from '../types';

/**
 * Console.log style formatting using node's `util.format`. We need this so we
 * can override console.{log, error, etc.} without issue.
 */
export const nodeUtilFormat = winston.format((info, _opts) => {
  const typedInfo = info as ITransformableInfo;
  const args = typedInfo[SPLAT as unknown as string] as unknown[];

  // For our standardized logging, we don't want to format the details/error
  // since they're already structured. Only format the message if there are args.
  if (args && args.length > 0) {
    // Only format if it's not our standardized logging format
    // (which already has structured details/error fields)
    if (!typedInfo.details && !typedInfo.error) {
      typedInfo.message = format(typedInfo.message, ...args);
    }
  }

  return typedInfo;
});
