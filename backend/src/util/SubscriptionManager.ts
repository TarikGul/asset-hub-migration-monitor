import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { Log } from '../logging/Log';
import { runAhEventsService, runAhNewHeadsService, runAhMigrationStageService, runAhUmpPendingMessagesService, runAhXcmMessageCounterService } from '../services/ahService';
import { runRcDmpDataMessageCountsService, runRcNewHeadsService, runRcMessageQueueProcessedService, runRcMigrationStageService, runRcXcmMessageCounterService } from '../services/rcService';
import { migrationStages } from '../db/schema';

interface CleanupSub {
    service: string;
    action: string;
    unsub: () => void;
}

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private cleanUpSubs: CleanupSub[] = [];
    public migrationStartBlockNumber?: number | null = undefined;
    public migrationStarted?: boolean | null = undefined;
    public allSubsInitialized: boolean = false;

    constructor() {}

    public static getInstance(): SubscriptionManager {
        if (!SubscriptionManager.instance) {
            SubscriptionManager.instance = new SubscriptionManager();
        }

        return SubscriptionManager.instance;
    }

    public async checkCurrentMigrationStageInDB() {
        const migrationStage = await db.query.migrationStages.findFirst({
            where: and(eq(migrationStages.chain, 'relay-chain'), eq(migrationStages.stage, 'Scheduled')),
        });

        const latestMigrationStage = await db.query.migrationStages.findFirst({
            where: eq(migrationStages.chain, 'relay-chain'),
            orderBy: desc(migrationStages.blockNumber),
        });

        if (latestMigrationStage) {
            this.migrationStarted = latestMigrationStage.stage === 'Scheduled' || latestMigrationStage.stage === 'Pending' ? false : true;
        }

        if (migrationStage) {
            this.migrationStartBlockNumber = migrationStage.scheduledBlockNumber;
        }
    }

    public setMigrationBlockNumber(blockNumber: number) {
        this.migrationStartBlockNumber = blockNumber;
    }

    public initRcPreMigrationService() {
        runRcMigrationStageService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up RC migration stage subscription',
                unsub: result
            }))
            .catch(err => 
                Log.service({
                    service: 'RC Migration Stage',
                    action: 'Service start error',
                    error: err as Error,
                })
            )

        runRcNewHeadsService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up RC new heads subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                  service: 'RC New Heads',
                  action: 'Service start error',
                  error: err as Error,
                })
              );

        runAhNewHeadsService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up AH new heads subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                  service: 'AH new Heads',
                  action: 'Service start error',
                  error: err as Error,
                })
            );
    };

    public initAllMigrationSubs() {
        runRcXcmMessageCounterService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up RC XCM message counter subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                service: 'RC XCM Message Counter',
                action: 'Service start error',
                error: err as Error,
                })
            );
        
        runRcDmpDataMessageCountsService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up RC DMP data message counts subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                  service: 'RC DMP Data Message Counts',
                  action: 'Service start error',
                  error: err as Error,
                })
            );
        
        runRcMessageQueueProcessedService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up RC events subscription',
                unsub: result
            }))
            .catch((err: Error) =>
                Log.service({
                  service: 'RC Message Queue Processed',
                  action: 'Service start error',
                  error: err as Error,
                })
            );

        runAhMigrationStageService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up AH migration stage subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                    service: 'AH Migration Stage',
                    action: 'Service start error',
                    error: err as Error,
                })
            );
        
        runAhXcmMessageCounterService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up AH XCM message counter subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                  service: 'AH XCM Message Counter',
                  action: 'Service start error',
                  error: err as Error,
                })
            );

        runAhEventsService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up AH events subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                  service: 'AH Events',
                  action: 'Service start error',
                  error: err as Error,
                })
            );
        
        runAhUmpPendingMessagesService()
            .then(result => this.cleanUpSubs.push({
                service: 'Application',
                action: 'Cleaning up AH UMP pending messages subscription',
                unsub: result
            }))
            .catch(err =>
                Log.service({
                  service: 'AH UMP Pending Messages',
                  action: 'Service start error',
                  error: err as Error,
                })
            );
        
        this.allSubsInitialized = true;
    }
    

    public cleanupAllSubs() {
        this.cleanUpSubs.forEach(info => {
            Log.service({
                service: info.service,
                action: info.action
            });

            info.unsub();
        });
    }
}