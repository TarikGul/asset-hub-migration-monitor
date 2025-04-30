import { SPLAT } from 'triple-beam';
import { format } from 'util';
import * as winston from 'winston';

import { ITransformableInfo } from '../types';

/**
 * Console.log style formatting using node's `util.format`. We need this so we
 * can override console.{log, error, etc.} without issue.
 */
export const nodeUtilFormat = winston.format(
	(info, _opts) => {
		const typedInfo = info as ITransformableInfo;
		const args = typedInfo[SPLAT as unknown as string] as unknown[];
		if (args) {
			typedInfo.message = format(typedInfo.message, ...args);
		}
		return typedInfo;
	}
);
