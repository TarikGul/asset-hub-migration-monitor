import { ApiPromise, WsProvider } from '@polkadot/api';

import { getConfig } from '../config';

export const abstractApi = async (type: 'asset-hub' | 'relay-chain') => {
    const config = getConfig();
    const url = type === 'asset-hub' ? config.assetHubUrl : config.relayChainUrl;

    const api = await ApiPromise.create({
        provider: new WsProvider(url),
    });

    await api.isReady;

    return api;
}
