import { eventService } from "../eventService";
import { DmpMetricsCache } from "./DmpMetricsCache";

interface DmpEvent {
  timestamp: Date;
  blockNumber: number;
}

export class DmpLatencyProcessor {
  private static instance: DmpLatencyProcessor;
  private fillMessageStack: DmpEvent[] = [];
  private messageQueueStack: DmpEvent[] = [];
  private readonly maxStackSize = 10; // Keep last 10 events in each stack
  private readonly defaultLatencyMs = 200; // 0.2 seconds default for race conditions

  private constructor() {}

  public static getInstance(): DmpLatencyProcessor {
    if (!DmpLatencyProcessor.instance) {
      DmpLatencyProcessor.instance = new DmpLatencyProcessor();
    }
    return DmpLatencyProcessor.instance;
  }

  // Add fill message sent event
  public addFillMessageSent(blockNumber: number, timestamp: Date): void {
    this.fillMessageStack.push({ timestamp, blockNumber });    
    // Keep only the last maxStackSize events
    if (this.fillMessageStack.length > this.maxStackSize) {
      this.fillMessageStack.shift();
    }

    // Try to process any pending message queue events
    this.processPendingEvents();
  }

  // Add message queue processed event
  public addMessageQueueProcessed(blockNumber: number, timestamp: Date): void {
    this.messageQueueStack.push({ timestamp, blockNumber });
    
    // Keep only the last maxStackSize events
    if (this.messageQueueStack.length > this.maxStackSize) {
      this.messageQueueStack.shift();
    }

    // Try to process any pending fill message events
    this.processPendingEvents();
  }

  private processPendingEvents(): void {
    // Wait until both stacks have at least 1 value
    if (this.fillMessageStack.length < 1 || this.messageQueueStack.length < 1) {
      return;
    }

    const firstFillEvent = this.fillMessageStack[0];
    const firstQueueEvent = this.messageQueueStack[0];
    
    // Found a timestamp match, calculate latency
    const latencyMs = firstQueueEvent.timestamp.getTime() - firstFillEvent.timestamp.getTime();
    this.emitLatency(latencyMs, firstQueueEvent.blockNumber, firstQueueEvent.timestamp);
    
    // Remove the matched events
    this.fillMessageStack.shift();
    this.messageQueueStack.shift();
  }

  private emitLatency(latencyMs: number, blockNumber: number, timestamp: Date): void {
    const dmpMetricsCacheInstance = DmpMetricsCache.getInstance();
    dmpMetricsCacheInstance.updateAverageLatency(latencyMs);

    eventService.emit('dmpLatency', {
      latencyMs,
      averageLatencyMs: dmpMetricsCacheInstance.getAverageLatencyMs(),
      blockNumber,
      timestamp: timestamp.toISOString(),
    });
  }

  // Get current stack sizes for debugging
  public getStackSizes(): { fill: number; queue: number } {
    return {
      fill: this.fillMessageStack.length,
      queue: this.messageQueueStack.length,
    };
  }

  // Clear stacks (useful for testing or reset)
  public clearStacks(): void {
    this.fillMessageStack = [];
    this.messageQueueStack = [];
  }
} 