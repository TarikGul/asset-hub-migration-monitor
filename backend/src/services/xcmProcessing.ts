import { ApiPromise } from '@polkadot/api';
import type { Block } from '@polkadot/types/interfaces';
import {
  XcmMessage,
  IExtrinsic,
  ISanitizedParachainInherentData,
  ISanitizedParentInherentData
} from '../types/xcm';

export async function decodeXcmMessage(api: ApiPromise, message: any): Promise<string> {
  try {
    // If the message is a string, try to decode it directly
    if (typeof message === 'string') {
      const instructions = [];
      let xcmMessage = message;
      let instructionLength = 0;
      
      while (xcmMessage.length !== 0) {
        const xcmInstructions = api.createType('XcmVersionedXcm', xcmMessage);
        instructions.push(xcmInstructions);
        instructionLength = xcmInstructions.toU8a().length;
        xcmMessage = xcmMessage.slice(instructionLength);
      }
      return JSON.stringify(instructions, null, 2);
    }
    
    // If it's an object with a v4 field, it's likely a versioned XCM message
    if (message?.v4) {
      const xcmInstructions = api.createType('XcmVersionedXcm', message);
      return xcmInstructions.toString();
    }

    // If it's an array of assets or other XCM-related data, stringify it
    return JSON.stringify(message, null, 2);
  } catch (error) {
    console.error('Error decoding XCM message:', error);
    return 'Failed to decode XCM message';
  }
}

async function processUpwardMessages(
  api: ApiPromise,
  messages: XcmMessage[],
  paraId: string,
  upwardMessages: string[]
): Promise<void> {
  for (const msg of upwardMessages) {
    if (msg) {
      // Check if we already have a message from this parachain
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type === 'upward' && lastMessage.metadata.originParaId === paraId) {
        continue;
      }

      const decoded = await decodeXcmMessage(api, msg);
      messages.push({
        type: 'upward',
        data: decoded,
        metadata: {
          originParaId: paraId,
        }
      });
    }
  }
}

export async function processExtrinsic(api: ApiPromise, extrinsic: IExtrinsic): Promise<XcmMessage[]> {
  const messages: XcmMessage[] = [];
  const { method: { method, section } } = extrinsic;

  // Handle different types of XCM messages
  if (section === 'polkadotXcm' || section === 'xcmPallet') {
    // For XCM transfer methods, we want to capture the destination and assets
    const decoded = await decodeXcmMessage(api, extrinsic.args);
    let destinationParaId: string | undefined;
    
    // Safely extract parachain ID from the destination
    try {
      const dest = extrinsic.args.dest;
      if (dest && typeof dest === 'object' && 'v4' in dest) {
        const parachain = dest.v4?.interior?.x1?.[0]?.parachain;
        if (parachain) {
          destinationParaId = parachain.toString();
        }
      }
    } catch (error) {
      console.error('Error extracting destination paraId:', error);
    }

    messages.push({
      type: 'horizontal',
      data: decoded,
      metadata: {
        destinationParaId
      }
    });
  } else if (section === 'parachainSystem') {
    if (method === 'setValidationData' && extrinsic.args.data) {
      const data = extrinsic.args.data as ISanitizedParachainInherentData;
      
      if (Array.isArray(data.downwardMessages)) {
        for (const msg of data.downwardMessages) {
          if (msg?.msg) {
            const decoded = await decodeXcmMessage(api, msg.msg);
            messages.push({
              type: 'downward',
              data: decoded,
              metadata: {
                sentAt: msg.sentAt
              }
            });
          }
        }
      }

      // TODO: We dont need to retrieve horizontal messages for the AHM
      if (data.horizontalMessages && data.horizontalMessages instanceof Map) {
        for (const [paraId, msgs] of data.horizontalMessages.entries()) {
          for (const msg of msgs) {
            if (msg?.data) {
              const decoded = await decodeXcmMessage(api, msg.data.slice(1));
              messages.push({
                type: 'horizontal',
                data: decoded,
                metadata: {
                  originParaId: paraId.toString(),
                  sentAt: msg.sentAt
                }
              });
            }
          }
        }
      }
    }
  } else if (section === 'paraInherent') {
    if (method === 'enter' && extrinsic.args.data) {
      const data = extrinsic.args.data as ISanitizedParentInherentData;
      
      if (data && typeof data === 'object' && 'backedCandidates' in data) {
        const backedCandidates = data.backedCandidates;
        console.log(`Found ${backedCandidates?.length} backed candidates`);
        
        if (Array.isArray(backedCandidates)) {
          for (const candidate of backedCandidates) {
            if (candidate?.candidate?.descriptor?.paraId && candidate.candidate.commitments) {
              const paraId = candidate.candidate.descriptor.paraId.toString();
              const commitments = candidate.candidate.commitments;
              console.log(`Processing candidate for paraId ${paraId} with commitments:`, JSON.stringify(commitments, null, 2));
              
              // Process upward messages using the dedicated function
              if (Array.isArray(commitments.upwardMessages) && commitments.upwardMessages.length > 0) {
                console.log(`Found ${commitments.upwardMessages.length} upward messages for paraId ${paraId}`);
                await processUpwardMessages(api, messages, paraId, commitments.upwardMessages);
              }

              // Process horizontal messages
              if (Array.isArray(commitments.horizontalMessages) && commitments.horizontalMessages.length > 0) {
                console.log(`Found ${commitments.horizontalMessages.length} horizontal messages for paraId ${paraId}`);
                for (const msg of commitments.horizontalMessages) {
                  if (msg?.data) {
                    const decoded = await decodeXcmMessage(api, msg.data.slice(1));
                    messages.push({
                      type: 'horizontal',
                      data: decoded,
                      metadata: {
                        originParaId: paraId,
                        destinationParaId: msg.recipient?.toString()
                      }
                    });
                  }
                }
              }
            }
          }
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