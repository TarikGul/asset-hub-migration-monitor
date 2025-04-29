# Database Schema Specification

## Core Tables

### 1. Migration Stages
```typescript
migration_stages {
  id: number (PK)
  stage_name: string
  status: enum('pending', 'ongoing', 'completed', 'failed')
  started_at: timestamp
  completed_at: timestamp
  error_count: number
  last_updated: timestamp
}
```

### 2. XCM Message Counters
```typescript
xcm_message_counters {
  id: number (PK)
  source_chain: string
  destination_chain: string
  messages_sent: number
  messages_processed: number
  messages_failed: number
  last_updated: timestamp
}
```

### 3. Balance Migration Counters
```typescript
balance_migration_counters {
  id: number (PK)
  accounts_migrated: number
  total_balance_migrated: number
  total_balance_kept: number
  failed_migrations: number
  last_updated: timestamp
}
```

### 4. Teleportation Counters
```typescript
teleportation_counters {
  id: number (PK)
  total_mints: number
  total_burns: number
  total_mint_amount: number
  total_burn_amount: number
  failed_operations: number
  last_updated: timestamp
}
```

### 5. Pallet Migration Counters
```typescript
pallet_migration_counters {
  id: number (PK)
  pallet_name: string
  stage_id: number (FK to migration_stages)
  items_processed: number
  total_items: number
  failed_items: number
  last_updated: timestamp
}
```

## Relationships

1. `pallet_migration_counters.stage_id` -> `migration_stages.id`
   - Each pallet migration counter belongs to a specific migration stage

## Indexes

1. `migration_stages`
   - Index on `status`
   - Index on `started_at`

2. `xcm_message_counters`
   - Index on `source_chain`
   - Index on `destination_chain`
   - Index on `last_updated`

3. `balance_migration_counters`
   - Index on `last_updated`

4. `teleportation_counters`
   - Index on `last_updated`

5. `pallet_migration_counters`
   - Index on `pallet_name`
   - Index on `stage_id`
   - Index on `last_updated`

## Notes

1. All timestamps should be stored in UTC
2. All monetary values should be stored as integers (smallest unit)
3. Status enums should be consistent across tables
4. Consider adding soft delete functionality if needed
5. Counters should be updated atomically to ensure consistency 