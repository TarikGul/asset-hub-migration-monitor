import dotenv from 'dotenv';

import { Config } from './types';

dotenv.config();

let cachedConfig: Config | null = null;

const loadConfig = (): Config => {
  const assetHubUrl = process.env.ASSET_HUB_URL;
  const relayChainUrl = process.env.RELAY_CHAIN_URL;
  const port = process.env.PORT || 8080;
  const logLevel = process.env.LOG_LEVEL || 'info';

  if (!assetHubUrl) {
    throw new Error('ASSET_HUB_URL environment variable is required');
  }

  if (!relayChainUrl) {
    throw new Error('RELAY_CHAIN_URL environment variable is required');
  }

  return {
    assetHubUrl,
    relayChainUrl,
    port: typeof port === 'string' ? parseInt(port, 10) : port,
    logLevel,
  };
};

export const getConfig = (): Config => {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
};
