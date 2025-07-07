import { TimeInStageCache } from './TimeInStageCache';

// Simple test to verify TimeInStageCache functionality
async function testTimeInStageCache() {
  console.log('Testing TimeInStageCache...');
  
  const cache = TimeInStageCache.getInstance();
  
  // Test recording Init stage for Accounts pallet
  const isNewInit = await cache.recordStageStart('AccountsMigrationInit', 12345);
  console.log('Recorded Accounts Init stage:', isNewInit);
  
  // Test recording Ongoing stage for Accounts pallet
  const isNewOngoing = await cache.recordStageStart('AccountsMigrationOngoing', 12346);
  console.log('Recorded Accounts Ongoing stage:', isNewOngoing);
  
  // Test getting pallet info
  const palletInfo = cache.getCurrentPalletInfo('Accounts');
  console.log('Accounts pallet info:', palletInfo);
  
  // Test formatted time in pallet
  const formattedTime = cache.getFormattedTimeInPallet('Accounts');
  console.log('Formatted time in Accounts pallet:', formattedTime);
  
  // Test recording Done stage for Accounts pallet
  const isNewDone = await cache.recordStageStart('AccountsMigrationDone', 12350);
  console.log('Recorded Accounts Done stage:', isNewDone);
  
  // Test getting completed pallet info
  const completedPalletInfo = cache.getCurrentPalletInfo('Accounts');
  console.log('Completed Accounts pallet info:', completedPalletInfo);
  
  // Test formatted duration for completed pallet
  const formattedDuration = cache.getFormattedPalletDuration('Accounts');
  console.log('Formatted duration for Accounts pallet:', formattedDuration);
  
  // Test active and completed pallets
  const activePallets = cache.getActivePallets();
  const completedPallets = cache.getCompletedPallets();
  const startedPallets = cache.getStartedPallets();
  console.log('Active pallets:', activePallets);
  console.log('Completed pallets:', completedPallets);
  console.log('Started pallets:', startedPallets);
  
  // Test non-existent pallet
  const nonExistent = cache.getCurrentPalletInfo('NonExistentPallet');
  console.log('Non-existent pallet:', nonExistent);
  
  console.log('TimeInStageCache test completed!');
}

// Run test if this file is executed directly
if (require.main === module) {
  testTimeInStageCache().catch(console.error);
}

export { testTimeInStageCache }; 