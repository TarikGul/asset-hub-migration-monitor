import { ApiPromise } from '@polkadot/api';
import type { Block } from '@polkadot/types/interfaces';
import {
  XcmMessage,
  IExtrinsic,
  ISanitizedParachainInherentData,
  ISanitizedParentInherentData
} from '../types/xcm';

export async function decodeXcmMessage(api: ApiPromise, message: string): Promise<string> {
  try {
    const xcmInstructions = api.createType('XcmVersionedXcm', message);
    return xcmInstructions.toString();
  } catch (error) {
    console.error('Error decoding XCM message:', error);
    return 'Failed to decode XCM message';
  }
}

export async function processExtrinsic(api: ApiPromise, extrinsic: IExtrinsic): Promise<XcmMessage[]> {
  const messages: XcmMessage[] = [];
  const { method: { method, section } } = extrinsic;

  // Handle different types of XCM messages
  if (section === 'polkadotXcm' || section === 'xcmPallet') {
    if (method === 'send' || method === 'limitedReserveTransferAssets') {
      const message = extrinsic.args.message?.toString();
      if (message) {
        const decoded = await decodeXcmMessage(api, message);
        messages.push({
          type: 'horizontal',
          data: decoded,
          destinationParaId: extrinsic.args.dest?.toString(),
        });
      }
    }
  } else if (section === 'parachainSystem') {
    if (method === 'setValidationData') {
      const data = extrinsic.args.data as ISanitizedParachainInherentData;
      // Process downward messages
      if (data.downwardMessages) {
        for (const msg of data.downwardMessages) {
          if (msg.msg && msg.msg.toString().length > 0) {
            const decoded = await decodeXcmMessage(api, msg.msg.toString());
            messages.push({
              type: 'downward',
              data: decoded,
              sentAt: msg.sentAt,
            });
          }
        }
      }
      // Process horizontal messages
      if (data.horizontalMessages) {
        for (const [paraId, msgs] of data.horizontalMessages.entries()) {
          for (const msg of msgs) {
            const decoded = await decodeXcmMessage(api, msg.data.slice(1).toString());
            messages.push({
              type: 'horizontal',
              data: decoded,
              originParaId: paraId.toString(),
              sentAt: msg.sentAt,
            });
          }
        }
      }
    }
  } else if (section === 'paraInherent') {
    if (method === 'enter') {
      const data = extrinsic.args.data as ISanitizedParentInherentData;
      // Process upward messages
      for (const candidate of data.backedCandidates) {
        const paraId = candidate.candidate.descriptor.paraId;
        for (const msg of candidate.candidate.commitments.upwardMessages) {
          const decoded = await decodeXcmMessage(api, msg);
          messages.push({
            type: 'upward',
            data: decoded,
            originParaId: paraId.toString(),
          });
        }
        // Process horizontal messages
        for (const msg of candidate.candidate.commitments.horizontalMessages) {
          const decoded = await decodeXcmMessage(api, msg.data);
          messages.push({
            type: 'horizontal',
            data: decoded,
            originParaId: paraId.toString(),
            destinationParaId: msg.destinationParaId,
          });
        }
      }
    }
  }

  return messages;
}

export async function processBlock(api: ApiPromise, block: Block): Promise<XcmMessage[]> {
  const allMessages: XcmMessage[] = [];

  for (const extrinsic of block.extrinsics) {
    const messages = await processExtrinsic(api, extrinsic as unknown as IExtrinsic);
    allMessages.push(...messages);
  }

  return allMessages;
} 