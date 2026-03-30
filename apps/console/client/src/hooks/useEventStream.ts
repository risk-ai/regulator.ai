/**
 * SSE Event Stream Hook
 * 
 * Connects to Vienna OS real-time event stream.
 * Auto-reconnects on disconnect. Provides typed pipeline events.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface PipelineEvent {
  type: 'connected' | 'pipeline_event' | 'heartbeat';
  event?: string;
  actor?: string;
  risk_tier?: number;
  proposal_id?: string;
  warrant_id?: string;
  timestamp?: string;
}

interface UseEventStreamOptions {
  /** Enable/disable the stream */
  enabled?: boolean;
  /** Max events to keep in buffer */
  maxEvents?: number;
  /** Callback for each event */
  onEvent?: (event: PipelineEvent) => void;
}

export function useEventStream(options: UseEventStreamOptions = {}) {
  const { enabled = true, maxEvents = 50, onEvent } = options;
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!enabled) return;
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    try {
      const es = new EventSource('/api/v1/stream/events');
      sourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
      };

      es.onmessage = (msg) => {
        try {
          const data: PipelineEvent = JSON.parse(msg.data);
          if (data.type === 'connected') {
            setConnected(true);
            return;
          }
          if (data.type === 'pipeline_event') {
            setEvents(prev => [data, ...prev].slice(0, maxEvents));
            onEvent?.(data);
          }
        } catch {}
      };

      es.onerror = () => {
        setConnected(false);
        setError('Stream disconnected');
        es.close();
        // Reconnect after 5s
        reconnectTimer.current = setTimeout(connect, 5000);
      };
    } catch (err) {
      setError('Failed to connect to event stream');
    }
  }, [enabled, maxEvents, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      sourceRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { connected, events, error, clearEvents };
}
