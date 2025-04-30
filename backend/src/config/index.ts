import { Config } from './types';
import dotenv from 'dotenv';

dotenv.config();

const loadConfig = (): Config => {
  const assetHubUrl = process.env.ASSET_HUB_URL;
  const relayChainUrl = process.env.RELAY_CHAIN_URL;

  if (!assetHubUrl) {
    throw new Error('ASSET_HUB_URL environment variable is required');
  }

  if (!relayChainUrl) {
    throw new Error('RELAY_CHAIN_URL environment variable is required');
  }

  return {
    assetHubUrl,
    relayChainUrl,
  };
};

export const getConfig = (): Config => {
  return loadConfig();
}; 