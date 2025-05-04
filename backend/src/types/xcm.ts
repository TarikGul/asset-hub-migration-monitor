import type { Bytes } from '@polkadot/types';
import type { GenericExtrinsic } from '@polkadot/types';

export interface XcmMessage {
  type: 'upward' | 'downward' | 'horizontal';
  data: string;
  metadata: {
    paraId?: string;
    originParaId?: string;
    destinationParaId?: string;
    sentAt?: number;
  };
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
  downwardMessages: Array<{
    msg: string;
    sentAt: number;
  }>;
  horizontalMessages: Map<number, Array<{
    data: string;
    sentAt: number;
  }>>;
  [key: string]: any;
}

export interface ISanitizedBackedCandidateCommitments {
  upwardMessages: string[];
  horizontalMessages: Array<{
    data: string;
    recipient: string | number;
  }>;
  newValidationCode: string | null;
  headData: string;
  processedDownwardMessages: number;
  hrmpWatermark: number;
}

export interface ISanitizedBackedCandidate {
  candidate: {
    descriptor: {
      paraId: string | number;
      [key: string]: any;
    };
    commitments: ISanitizedBackedCandidateCommitments;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ISanitizedParentInherentData {
  backedCandidates: ISanitizedBackedCandidate[];
  [key: string]: any;
}

export interface IFrameMethod {
  pallet: string;
  method: string;
  section: string;
}

export interface XcmV4Interior {
  x1?: Array<{
    parachain?: number;
    accountId32?: {
      network?: string | null;
      id: string;
    };
  }>;
}

export interface XcmV4Destination {
  v4: {
    parents: number;
    interior: XcmV4Interior;
  };
}

export interface IExtrinsic {
  method: {
    method: string;
    section: string;
  };
  args: {
    data?: ISanitizedParentInherentData | ISanitizedParachainInherentData;
    [key: string]: any;
  };
} 