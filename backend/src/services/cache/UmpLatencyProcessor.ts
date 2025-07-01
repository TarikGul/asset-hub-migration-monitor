import { eventService } from "../eventService";
import { UmpMetricsCache } from "./UmpMetricsCache";

interface UmpEvent {
  timestamp: Date;
  blockNumber: number;
}

export class UmpLatencyProcessor {
  private static instance: UmpLatencyProcessor;
  private upwardMessageStack: UmpEvent[] = [];
  private messageQueueStack: UmpEvent[] = [];
  private readonly maxStackSize = 10; // Keep last 10 events in each stack
  private readonly defaultLatencyMs = 200; // 0.2 seconds default for race conditions

  private constructor() {}

  public static getInstance(): UmpLatencyProcessor {
    if (!UmpLatencyProcessor.instance) {
      UmpLatencyProcessor.instance = new UmpLatencyProcessor();
    }
    return UmpLatencyProcessor.instance;
  }

  // Add upward message sent event
  public addUpwardMessageSent(blockNumber: number, timestamp: Date): void {
    console.log('addUpwardMessageSent', blockNumber, timestamp);
    this.upwardMessageStack.push({ timestamp, blockNumber });
    
    // Keep only the last maxStackSize events
    if (this.upwardMessageStack.length > this.maxStackSize) {
      this.upwardMessageStack.shift();
    }

    // Try to process any pending message queue events
    this.processPendingEvents();
  }

  // Add message queue processed event
  public addMessageQueueProcessed(blockNumber: number, timestamp: Date): void {
    console.log('addMessageQueueProcessed', blockNumber, timestamp);
    this.messageQueueStack.push({ timestamp, blockNumber });
    
    // Keep only the last maxStackSize events
    if (this.messageQueueStack.length > this.maxStackSize) {
      this.messageQueueStack.shift();
    }

    // Try to process any pending upward message events
    this.processPendingEvents();
  }

  private processPendingEvents(): void {
    // Process events in chronological order
    while (this.upwardMessageStack.length > 0 && this.messageQueueStack.length > 0) {
      const upwardEvent = this.upwardMessageStack[0];
      const queueEvent = this.messageQueueStack[0];

      console.log('upwardEvent', upwardEvent);
      console.log('queueEvent', queueEvent);

      // If upward message came first, calculate latency
      if (upwardEvent.timestamp <= queueEvent.timestamp) {
        const latencyMs = queueEvent.timestamp.getTime() - upwardEvent.timestamp.getTime();
        console.log('latencyMs', latencyMs);
        this.emitLatency(latencyMs, queueEvent.blockNumber, queueEvent.timestamp);
        
        // Remove processed events
        this.upwardMessageStack.shift();
        this.messageQueueStack.shift();
      } 
      // If message queue processed came first (race condition), use default latency
      else {
        console.log('defaultLatencyMs', this.defaultLatencyMs);
        this.emitLatency(this.defaultLatencyMs, queueEvent.blockNumber, queueEvent.timestamp);
        
        // Remove the queue event but keep the upward message for potential future matching
        this.messageQueueStack.shift();
        this.upwardMessageStack.shift();
      }
    }
  }

  private emitLatency(latencyMs: number, blockNumber: number, timestamp: Date): void {
    const umpMetricsCacheInstance = UmpMetricsCache.getInstance();
    umpMetricsCacheInstance.updateAverageLatency(latencyMs);

    eventService.emit('umpLatency', {
      latencyMs,
      averageLatencyMs: umpMetricsCacheInstance.getAverageLatencyMs(),
      blockNumber,
      timestamp: timestamp.toISOString(),
    });
  }

  // Get current stack sizes for debugging
  public getStackSizes(): { upward: number; queue: number } {
    return {
      upward: this.upwardMessageStack.length,
      queue: this.messageQueueStack.length,
    };
  }

  // Clear stacks (useful for testing or reset)
  public clearStacks(): void {
    this.upwardMessageStack = [];
    this.messageQueueStack = [];
  }
} 