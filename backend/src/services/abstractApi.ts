import { ApiPromise, WsProvider } from '@polkadot/api';

export const abstractApi = async (url: string) => {
    const api = await ApiPromise.create({
        provider: new WsProvider(url),
    });

    await api.isReady;

    return api;
}
