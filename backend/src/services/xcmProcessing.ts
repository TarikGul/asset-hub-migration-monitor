import { ApiPromise } from '@polkadot/api';
import type { Block } from '@polkadot/types/interfaces';
import type { GenericExtrinsic } from '@polkadot/types';
import type { AnyJson, AnyTuple, Codec, Registry } from '@polkadot/types/types';
import type { XcmVersionedXcm } from '@polkadot/types/lookup';
import { GenericCall, Struct } from '@polkadot/types';
import { Log } from '../logging/Log';
import {
  XcmMessage,
  ISanitizedParachainInherentData,
  ISanitizedParentInherentData
} from '../types/xcm';

const { logger } = Log;

/**
 * Decode XCM message into a human-readable format
 */
export async function decodeXcmMessage(api: ApiPromise, message: any): Promise<string> {
  try {    
    const xcmInstructions: XcmVersionedXcm = api.createType('XcmVersionedXcm', message);
    // if ((xcmInstructions as unknown as { isV3: boolean }).isV3) {
    //   let xcm = xcmInstructions.asV3;
    //   if (xcm) {

    //   };
    // }
    // console.log('xcmInstructions', api.registry.createType('Call', (xcmInstructions.toHuman() as { V3: [{}, { Transact: { call: { encoded: string} } }] }).V3![1].Transact.call.encoded).toJSON());
    return JSON.stringify(xcmInstructions.toHuman(), null, 2);
  } catch (error) {
    logger.error('Error decoding XCM message:', error);
    return 'Failed to decode XCM message';
  }
}

/**
 * Process upward messages from a parachain
 */
async function processUpwardMessages(
  api: ApiPromise,
  messages: XcmMessage[],
  paraId: string,
  upwardMessages: string[]
): Promise<void> {
  for (const msg of upwardMessages) {
    if (msg) {
      // Skip if we already have a message from this parachain
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

/**
 * Parse a GenericCall to get its arguments with proper types
 */
function parseGenericCall(genericCall: GenericCall, registry: Registry): Record<string, unknown> {
  const newArgs: Record<string, unknown> = {};
  const callArgs = genericCall.get('args') as Struct;

  if (callArgs?.defKeys) {
    for (const paramName of callArgs.defKeys) {
      newArgs[paramName] = callArgs.get(paramName);
    }
  }

  return newArgs;
}

/**
 * Process a single extrinsic for XCM messages
 */
export async function processExtrinsic(api: ApiPromise, extrinsic: GenericExtrinsic<AnyTuple>): Promise<XcmMessage[]> {
  const messages: XcmMessage[] = [];
  const { method: { method, section } } = extrinsic;

  logger.info(`Processing extrinsic: ${section}.${method}`);

  // Parse the extrinsic args
  const call = api.registry.createType('Call', extrinsic.method);
  const parsedArgs = parseGenericCall(call, api.registry);

  // Handle XCM pallet extrinsics
  if (section === 'polkadotXcm' || section === 'xcmPallet') {
    logger.info(`Found XCM pallet extrinsic: ${section}.${method}`);
    const decoded = await decodeXcmMessage(api, parsedArgs);
    let destinationParaId: string | undefined;
    
    try {
      const dest = parsedArgs.dest as { v4?: { interior?: { x1?: Array<{ parachain?: any }> } } };
      if (dest?.v4?.interior?.x1?.[0]?.parachain) {
        destinationParaId = dest.v4.interior.x1[0].parachain.toString();
      }
    } catch (error) {
      logger.error('Error extracting destination paraId:', error);
    }

    messages.push({
      type: 'horizontal',
      data: decoded,
      metadata: { destinationParaId }
    });
  }

  // Handle setValidationData extrinsic
  if (method === 'setValidationData' && parsedArgs.data) {
    const data = parsedArgs.data as ISanitizedParachainInherentData;
    
    if (Array.isArray(data.downwardMessages)) {
      logger.info(`Found ${data.downwardMessages.length} downward messages`);
      for (const msg of data.downwardMessages) {
        if (msg?.msg) {
          const decoded = await decodeXcmMessage(api, msg.msg);
          messages.push({
            type: 'downward',
            data: decoded,
            metadata: { sentAt: msg.sentAt }
          });
        }
      }
    }

    if (data.horizontalMessages instanceof Map) {
      logger.info(`Found horizontal messages from ${data.horizontalMessages.size} parachains`);
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

  // Handle enter extrinsic
  if (method === 'enter' && parsedArgs.data) {
    const data = parsedArgs.data as ISanitizedParentInherentData;
    
    if (data?.backedCandidates) {
      logger.info(`Found ${data.backedCandidates.length} backed candidates`);
      
      for (const candidate of data.backedCandidates) {
        if (!candidate?.candidate?.descriptor?.paraId || !candidate.candidate.commitments) {
          continue;
        }

        const paraId = candidate.candidate.descriptor.paraId.toString();
        const commitments = candidate.candidate.commitments;
        
        // Process upward messages
        if (Array.isArray(commitments.upwardMessages) && commitments.upwardMessages.length > 0) {
          logger.info(`Found ${commitments.upwardMessages.length} upward messages for paraId ${paraId}`);
          await processUpwardMessages(api, messages, paraId, commitments.upwardMessages);
        }

        // Process horizontal messages
        if (Array.isArray(commitments.horizontalMessages) && commitments.horizontalMessages.length > 0) {
          logger.info(`Found ${commitments.horizontalMessages.length} horizontal messages for paraId ${paraId}`);
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

  return messages;
}

/**
 * Process a block for XCM messages
 */
export async function processBlock(api: ApiPromise, block: Block): Promise<XcmMessage[]> {
  const allMessages: XcmMessage[] = [];

  for (const extrinsic of block.extrinsics) {
    const messages = await processExtrinsic(api, extrinsic);
    allMessages.push(...messages);
  }

  return allMessages;
} 