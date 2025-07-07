// Mapping from migration stages to pallet names
export const STAGE_TO_PALLET_MAP: Record<string, string> = {
  // Account-related stages
  'AccountsMigrationInit': 'Accounts',
  'AccountsMigrationOngoing': 'Accounts',
  'AccountsMigrationDone': 'Accounts',
  
  // Multisig stages
  'MultisigMigrationInit': 'Multisig',
  'MultisigMigrationOngoing': 'Multisig',
  'MultisigMigrationDone': 'Multisig',
  
  // Claims stages
  'ClaimsMigrationDone': 'Claims',
  
  // Proxy stages
  'ProxyMigrationInit': 'Proxy',
  'ProxyMigrationProxies': 'Proxy',
  'ProxyMigrationAnnouncements': 'Proxy',
  'ProxyMigrationDone': 'Proxy',
  
  // Preimage stages
  'PreimageMigrationInit': 'Preimage',
  'PreimageMigrationChunksOngoing': 'Preimage',
  'PreimageMigrationChunksDone': 'Preimage',
  'PreimageMigrationRequestStatusOngoing': 'Preimage',
  'PreimageMigrationRequestStatusDone': 'Preimage',
  'PreimageMigrationLegacyRequestStatusInit': 'Preimage',
  'PreimageMigrationLegacyRequestStatusOngoing': 'Preimage',
  'PreimageMigrationLegacyRequestStatusDone': 'Preimage',
  'PreimageMigrationDone': 'Preimage',
  
  // Nomination Pools stages
  'NomPoolsMigrationInit': 'NomPools',
  'NomPoolsMigrationOngoing': 'NomPools',
  'NomPoolsMigrationDone': 'NomPools',
  
  // Vesting stages
  'VestingMigrationInit': 'Vesting',
  'VestingMigrationOngoing': 'Vesting',
  'VestingMigrationDone': 'Vesting',
  
  // Fast Unstake stages
  'FastUnstakeMigrationInit': 'FastUnstake',
  'FastUnstakeMigrationOngoing': 'FastUnstake',
  'FastUnstakeMigrationDone': 'FastUnstake',
  
  // Indices stages
  'IndicesMigrationInit': 'Indices',
  'IndicesMigrationOngoing': 'Indices',
  'IndicesMigrationDone': 'Indices',
  
  // Referenda stages
  'ReferendaMigrationInit': 'Referenda',
  'ReferendaMigrationOngoing': 'Referenda',
  'ReferendaMigrationDone': 'Referenda',
  
  // Bags List stages
  'BagsListMigrationInit': 'BagsList',
  'BagsListMigrationOngoing': 'BagsList',
  'BagsListMigrationDone': 'BagsList',
  
  // Scheduler stages
  'SchedulerMigrationInit': 'Scheduler',
  'SchedulerMigrationOngoing': 'Scheduler',
  'SchedulerAgendaMigrationOngoing': 'Scheduler',
  'SchedulerMigrationDone': 'Scheduler',
  
  // Conviction Voting stages
  'ConvictionVotingMigrationInit': 'ConvictionVoting',
  'ConvictionVotingMigrationOngoing': 'ConvictionVoting',
  'ConvictionVotingMigrationDone': 'ConvictionVoting',
  
  // Bounties stages
  'BountiesMigrationDone': 'Bounties',
  
  // Asset Rate stages
  'AssetRateMigrationInit': 'AssetRate',
  'AssetRateMigrationOngoing': 'AssetRate',
  'AssetRateMigrationDone': 'AssetRate',
  
  // Crowdloan stages
  'CrowdloanMigrationDone': 'Crowdloan',
  
  // Treasury stages
  'TreasuryMigrationDone': 'Treasury',
  
  // Staking stages
  'StakingMigrationInit': 'Staking',
  'StakingMigrationOngoing': 'Staking',
  'StakingMigrationDone': 'Staking',
};

// Helper function to get pallet name from stage
export function getPalletFromStage(stage: string): string | null {
  return STAGE_TO_PALLET_MAP[stage] || null;
}

// Helper function to check if a stage is an Init stage
export function isInitStage(stage: string): boolean {
  return stage.includes('Init');
}

// Helper function to check if a stage is an Ongoing stage
export function isOngoingStage(stage: string): boolean {
  return stage.includes('Ongoing');
}

// Helper function to check if a stage is a Done stage
export function isDoneStage(stage: string): boolean {
  return stage.includes('Done') || stage.includes('Finish');
}

// Helper function to check if a stage is active (ongoing)
export function isStageActive(stage: string): boolean {
  return isOngoingStage(stage) || isInitStage(stage);
}

// Helper function to check if a stage is completed
export function isStageCompleted(stage: string): boolean {
  return isDoneStage(stage);
}

// Helper function to get the Init stage name for a pallet
export function getInitStageForPallet(pallet: string): string {
  return `${pallet}MigrationInit`;
}

// Helper function to get the Done stage name for a pallet
export function getDoneStageForPallet(pallet: string): string {
  return `${pallet}MigrationDone`;
} 