/**
 * SSE Stream Hook
 * 
 * Real-time event stream from Vienna Console Server.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { SSEEvent, SSEEventType } from './types.js';

// Default to same-origin for all deployments
const SSE_URL = '/api/v1/stream';

export interface UseViennaStreamOptions {
  onEvent: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

/**
 * Hook to subscribe to Vienna SSE stream
 */
export function useViennaStream(options: UseViennaStreamOptions) {
  const {
    onEvent,
    onError,
    onConnect,
    onDisconnect,
    reconnect = true,
    reconnectInterval = 3000,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Create new EventSource
    const eventSource = new EventSource(SSE_URL);
    eventSourceRef.current = eventSource;

    // Handle open
    eventSource.addEventListener('open', () => {
      console.log('SSE connection established');
      isConnectedRef.current = true;
      onConnect?.();
    });

    // Handle all event types
    const eventTypes: SSEEventType[] = [
      'system.status.updated',
      'objective.created',
      'objective.updated',
      'objective.completed',
      'execution.started',
      'execution.completed',
      'execution.failed',
      'execution.blocked',
      'decision.created',
      'decision.resolved',
      'deadletter.created',
      'deadletter.resolved',
      'health.updated',
      'integrity.updated',
      'alert.created',
      'replay.appended',
    ];

    eventTypes.forEach(type => {
      eventSource.addEventListener(type, (e: MessageEvent) => {
        try {
          const event: SSEEvent = JSON.parse(e.data);
          onEvent(event);
        } catch (error) {
          console.error(`Failed to parse SSE event (${type}):`, error);
        }
      });
    });

    // Handle errors
    eventSource.addEventListener('error', (e: Event) => {
      console.error('SSE error:', e);
      isConnectedRef.current = false;
      onError?.(e);
      onDisconnect?.();

      // Attempt reconnect
      if (reconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting SSE reconnect...');
          connect();
        }, reconnectInterval);
      }
    });
  }, [onEvent, onError, onConnect, onDisconnect, reconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isConnectedRef.current = false;
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    reconnect: connect,
    disconnect,
  };
}
