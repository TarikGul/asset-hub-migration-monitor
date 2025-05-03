import { abstractApi } from './abstractApi';

export async function runAssetHubService() {
    const api = await abstractApi('asset-hub');

    // Subscribe to new blocks (or use subscribeFinalizedHeads for only finalized blocks)
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
            
            // TODO: Get xcm messages
            block.extrinsics.forEach((extrinsic, index) => {
                const { method: { method, section } } = extrinsic;
                
                console.log(`Extrinsic ${index}: ${section}.${method}`);
            });
            
        } catch (error) {
            console.error(`Error processing block: ${error}`);
        }
    });

    return {
        unsubscribe
    }
}
