import { EventEmitter } from 'events';

// Create a singleton event emitter
class EventService extends EventEmitter {
  private static instance: EventService;

  private constructor() {
    super();
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }
}

export const eventService = EventService.getInstance();
