import { ApiPromise, WsProvider } from '@polkadot/api';

import { getConfig } from '../config';

export class AbstractApi {
  private static instance: AbstractApi;
  private relayChainApi: ApiPromise | null = null;
  private assetHubApi: ApiPromise | null = null;
  private relayChainProvider: WsProvider | null = null;
  private assetHubProvider: WsProvider | null = null;

  private constructor() {}

  public static getInstance(): AbstractApi {
    if (!AbstractApi.instance) {
      AbstractApi.instance = new AbstractApi();
    }
    return AbstractApi.instance;
  }

  public async getRelayChainApi(): Promise<ApiPromise> {
    if (!this.relayChainApi) {
      const config = getConfig();
      this.relayChainProvider = new WsProvider(config.relayChainUrl);
      this.relayChainApi = await ApiPromise.create({ provider: this.relayChainProvider });

      await this.relayChainApi.isReady;
    }
    return this.relayChainApi;
  }

  public async getAssetHubApi(): Promise<ApiPromise> {
    if (!this.assetHubApi) {
      const config = getConfig();
      this.assetHubProvider = new WsProvider(config.assetHubUrl);
      this.assetHubApi = await ApiPromise.create({ provider: this.assetHubProvider });

      await this.assetHubApi.isReady;
    }
    return this.assetHubApi;
  }

  public async disconnect(): Promise<void> {
    if (this.relayChainProvider) {
      await this.relayChainProvider.disconnect();
      this.relayChainProvider = null;
      this.relayChainApi = null;
    }
    if (this.assetHubProvider) {
      await this.assetHubProvider.disconnect();
      this.assetHubProvider = null;
      this.assetHubApi = null;
    }
  }
}
