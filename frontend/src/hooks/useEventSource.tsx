import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export type EventType = 'rcHead' | 'ahHead' | 'rcBalances' | 'rcXcmMessageCounter' | 'ahXcmMessageCounter' | 'rcStageUpdate' | 'ahStageUpdate';

interface EventSourceContextType {
  subscribe: (events: EventType[], callback: (eventType: EventType, data: any) => void) => () => void;
  isConnected: boolean;
  error: string | null;
}

const EventSourceContext = createContext<EventSourceContextType | null>(null);

interface EventSourceProviderProps {
  children: React.ReactNode;
}

export const EventSourceProvider: React.FC<EventSourceProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const listeners = useMemo(() => new Map<EventType, Set<(data: any) => void>>(), []);

  // Initialize single EventSource connection for all events
  useEffect(() => {
    const allEventTypes: EventType[] = ['rcHead', 'ahHead', 'rcBalances', 'rcXcmMessageCounter', 'ahXcmMessageCounter', 'rcStageUpdate', 'ahStageUpdate'];
    const es = new EventSource(`http://localhost:8080/api/updates?events=${allEventTypes.join(',')}`);
    setEventSource(es);

    es.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      if (data.connected) {
        setIsConnected(true);
        setError(null);
      }
    });

    // Set up listeners for all event types
    allEventTypes.forEach(eventType => {
      es.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventListeners = listeners.get(eventType);
          if (eventListeners) {
            eventListeners.forEach(listener => listener(data));
          }
        } catch (err) {
          console.error(`Error parsing ${eventType} event:`, err);
        }
      });
    });

    es.onerror = (err) => {
      console.error('SSE Error:', err);
      setError('Connection error');
      setIsConnected(false);
      es.close();
      setEventSource(null);
    };

    return () => {
      es.close();
      setEventSource(null);
      setIsConnected(false);
    };
  }, []); // Only run once on mount

  const subscribe = useCallback((events: EventType[], callback: (eventType: EventType, data: any) => void) => {
    // Add the callback to listeners for each event type
    events.forEach(eventType => {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }
      listeners.get(eventType)?.add((data) => callback(eventType, data));
    });

    // Return cleanup function
    return () => {
      events.forEach(eventType => {
        const eventListeners = listeners.get(eventType);
        if (eventListeners) {
          eventListeners.forEach(listener => {
            if (listener.toString() === ((data: any) => callback(eventType, data)).toString()) {
              eventListeners.delete(listener);
            }
          });
          if (eventListeners.size === 0) {
            listeners.delete(eventType);
          }
        }
      });
    };
  }, [listeners]);

  const value = useMemo(() => ({
    subscribe,
    isConnected,
    error
  }), [subscribe, isConnected, error]);

  return (
    <EventSourceContext.Provider value={value}>
      {children}
    </EventSourceContext.Provider>
  );
};

export const useEventSource = (events: EventType[], onEvent: (eventType: EventType, data: any) => void) => {
  const context = useContext(EventSourceContext);
  if (!context) {
    throw new Error('useEventSource must be used within an EventSourceProvider');
  }

  useEffect(() => {
    return context.subscribe(events, onEvent);
  }, [events.join(','), onEvent]);

  return {
    isConnected: context.isConnected,
    error: context.error
  };
}; 