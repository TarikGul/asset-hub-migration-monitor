import { abstractApi } from '../src/services/abstractApi';
import { processBlock } from '../src/services/xcmProcessing';

type ChainType = 'asset-hub' | 'relay-chain';

async function main() {
  // Get block number from command line arguments
  const blockNumber = process.argv[2];
  const chainArg = process.argv[3] || 'asset-hub';
  const chain: ChainType = chainArg === 'relay-chain' ? 'relay-chain' : 'asset-hub';

  if (!blockNumber) {
    console.error('Please provide a block number as an argument');
    console.error('Usage: yarn test:block <blockNumber> [chain]');
    console.error('Example: yarn test:block 8775006 asset-hub');
    process.exit(1);
  }

  console.log(`Testing block #${blockNumber} on ${chain}...`);

  try {
    // Connect to the specified chain
    const api = await abstractApi(chain);

    // Get the block hash for the given block number
    const hash = await api.rpc.chain.getBlockHash(blockNumber);
    console.log(`Block hash: ${hash.toHex()}`);

    // Get the complete block
    const signedBlock = await api.rpc.chain.getBlock(hash);
    const { block } = signedBlock;

    console.log(`
      Block: #${block.header.number}
      Hash: ${block.header.hash.toHex()}
      Extrinsic Count: ${block.extrinsics.length}
    `);

    // Process the block for XCM messages
    const xcmMessages = await processBlock(api, block);
    
    if (xcmMessages.length > 0) {
      console.log('\nXCM Messages found:');
      console.log(JSON.stringify(xcmMessages, null, 2));
    } else {
      console.log('\nNo XCM messages found in this block');
    }

    // Disconnect from the API
    await api.disconnect();
  } catch (error) {
    console.error('Error processing block:', error);
    process.exit(1);
  }
}

main().catch(console.error); 