import type { Bytes } from '@polkadot/types';
import type { GenericExtrinsic } from '@polkadot/types';

export interface XcmMessage {
  type: 'horizontal' | 'upward' | 'downward';
  data: string;
  originParaId?: string;
  destinationParaId?: string;
  sentAt?: number;
}

export interface IDownwardMessage {
  sentAt: number;
  msg: string;
  data: string;
}

export interface IHorizontalMessageInParachain {
  sentAt: number;
  originParaId: number;
  data: string;
}

export interface IHorizontalMessageInRelayChain {
  originParaId: string;
  destinationParaId: string;
  data: string;
}

export interface IUpwardMessage {
  originParaId: string;
  data: string;
}

export interface IMessages {
  horizontalMessages: IHorizontalMessageInParachain[] | IHorizontalMessageInRelayChain[];
  downwardMessages: IDownwardMessage[];
  upwardMessages: IUpwardMessage[];
}

export interface ISanitizedParachainInherentData {
  downwardMessages: IDownwardMessage[];
  horizontalMessages: Map<number, IHorizontalMessageInParachain[]>;
}

export interface ISanitizedParentInherentData {
  backedCandidates: {
    candidate: {
      descriptor: {
        paraId: number;
      };
      commitments: {
        upwardMessages: string[];
        horizontalMessages: IHorizontalMessageInRelayChain[];
      };
    };
  }[];
}

export interface IFrameMethod {
  pallet: string;
  method: string;
  section: string;
}

export interface IExtrinsic {
  method: IFrameMethod;
  args: {
    data?: ISanitizedParachainInherentData | ISanitizedParentInherentData;
    message?: Bytes;
    dest?: { toString: () => string };
  };
} 