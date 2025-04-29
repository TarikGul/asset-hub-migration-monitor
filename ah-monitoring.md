# Asset Hub Migration Monitoring System Design

## Summary of the Asset Hub Migration

1. **`pallet_rc_migrator`** (Relay Chain side):
   - Controls the migration stages and progression
   - Extracts data from various pallets (accounts, multisig, claims, proxy, preimage, referenda, etc.)
   - Sends data via XCM messages to the Asset Hub
   - Ensures data integrity during migration

2. **`pallet_ah_migrator`** (Asset Hub side):
   - Receives data from the Relay Chain
   - Integrates the received data into the Asset Hub's state
   - Tracks the stages of migration
   - Handles teleportation logic before, during, and after migration

The migration follows a strict sequence of stages for each subsystem, starting with account balances and progressing through various governance and utility modules. It's designed to be resumable if interrupted, with stage tracking and careful batch processing to manage the load.

## Monitoring System Design

### Dashboard Overview

#### 1. Migration Status Panel

- **Current Stage Indicator**: Visual display of the current migration stage from `MigrationStage` enums
- **Progress Bar**: Overall completion percentage based on completed vs. total stages
- **Timeline View**: Historical progression of stages with timestamps
- **Status Indicators**: Traffic light system showing overall health (green/yellow/red)

#### 2. XCM Message Metrics

- **Message Counters**: 
  - Total messages sent from RC
  - Total messages processed by AH
  - Messages in-flight (difference between sent and processed)
  - Error rate (percentage of messages with processing errors)
- **Message Queue Graph**: Line chart showing message queue depth over time
- **Error Log**: Last 10 message processing errors with details

#### 3. Per-Pallet Migration Status

- **Migration Progress Table**: For each pallet being migrated:
  - Status (pending/ongoing/completed)
  - Items processed / total items
  - Error count
  - Time spent in current stage
- **Filterable View**: Ability to focus on specific pallets

#### 4. Balance Migration Monitor

- **Balance Tracking**:
  - Total balance migrated
  - Total balance kept on RC (from `rc_balance_kept`)
  - Balance migration rate over time
- **Account Migration**: 
  - Number of accounts migrated
  - Distribution of account types (liquid vs. non-liquid)
  - Failed account migrations

#### 5. Teleportation Status

- **Teleportation State**: Whether teleports are enabled/disabled
- **Mints/Burns**: Track mint operations through the `CheckingAccount`
- **Balance Change Graph**: Total issuance change over time

#### 6. Alerts Panel (Maybe)

- **Critical Issues**: High priority alerts for stages stuck for too long
- **Error Rates**: Alert when error rates exceed thresholds
- **Balance Mismatches**: Alert for unexpected balance discrepancies
- **Recovery Options**: Quick links to troubleshooting tools

### Technical Implementation

#### Data Sources

1. **On-chain Storage**:
   - Query `RcMigrationStage` and `AhMigrationStage` storage items
   - Track `DmpDataMessageCounts` from both chains
   - Monitor `RcAccounts` and `RcBalanceKept` for balance information

2. **RPC Endpoints**:
   - Subscribe to events like `StageTransition` and `BatchReceived`
   - Query chain state for various migration-related storage items
   - Monitor block production rates and network health

#### Implementation Components

1. **Data Collection Service**:
   - Polkadot.js API integration to query both chains
   - Scheduled polling of key metrics
   - Event subscription for real-time updates
   - Log aggregation from network nodes

2. **Analytics Engine**:
   - Calculate derived metrics (progress percentages, success rates)
   - Generate trend data for graphical displays
   - Perform anomaly detection for alerting

### Specific Metrics to Track

Based on the code, here are key metrics that should be monitored:

1. **Stage Progression**:
   - Time spent in each migration stage
   - Unexpected stage transitions or regressions

2. **XCM Message Flow**:
   - Message counts from `DmpDataMessageCounts` on both chains
   - Processing success/error rates
   - Message size and processing time

3. **Pallet-specific Metrics**:
   - For each pallet being migrated, track:
     - Items processed per block
     - Processing success rate
     - Resource consumption

4. **Balance Consistency**:
   - Compare total balance before and after migration
   - Track `CheckingAccount` balance changes
   - Monitor balance-related errors
