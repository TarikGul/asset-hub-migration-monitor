import appRoot from 'app-root-path';
import { transports } from 'winston';

export function fileTransport(level: string, fileName: string): transports.FileTransportInstance {
  return new transports.File({
    level,
    filename: `${appRoot}/logs/${fileName}`,
    handleExceptions: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  });
}
