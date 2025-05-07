import { AbstractApi } from './abstractApi';
import { processBlock } from './xcmProcessing';

export async function runAssetHubService() {
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    console.log(`New block #${header.number} detected, fetching complete block...`);

    try {
      const signedBlock = await api.rpc.chain.getBlock(header.hash);
      const { block } = signedBlock;

      console.log(`
        Block: #${block.header.number}
        Hash: ${block.header.hash.toHex()}
        Extrinsic Count: ${block.extrinsics.length}
      `);

      // Process block for XCM messages
      const xcmMessages = await processBlock(api, block);
      if (xcmMessages.length > 0) {
        // TODO: Save to database
        console.log('XCM Messages found:', JSON.stringify(xcmMessages, null, 2));
      }
    } catch (error) {
      console.error(`Error processing block: ${error}`);
    }
  });

  return {
    unsubscribe
  };
}
