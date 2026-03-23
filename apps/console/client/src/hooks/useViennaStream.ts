/**
 * Vienna SSE Stream Hook
 * 
 * Connects to Vienna event stream and updates dashboard store
 */

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '../store/dashboardStore.js';

// Default to same-origin for all deployments
const SSE_BASE = '/api/v1';

export function useViennaStream() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const setSSEConnected = useDashboardStore((state) => state.setSSEConnected);
  const setSystemStatus = useDashboardStore((state) => state.setSystemStatus);
  
  const connect = () => {
    // Clear existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Connect to SSE stream
    console.log('[SSE] Attempting connection...');
    const eventSource = new EventSource(`${SSE_BASE}/stream`);
    eventSourceRef.current = eventSource;
    
    // Connection opened
    eventSource.onopen = () => {
      console.log('[SSE] Connected to Vienna event stream');
      setSSEConnected(true);
      reconnectAttemptsRef.current = 0; // Reset on successful connection
    };
    
    // Handle events
    eventSource.addEventListener('system.status', (event) => {
      try {
        const data = JSON.parse(event.data);
        setSystemStatus(data);
      } catch (error) {
        console.error('[SSE] Failed to parse system.status event:', error);
      }
    });
    
    eventSource.addEventListener('execution.paused', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Execution paused:', data);
        // Trigger status refresh
        // This will be handled by periodic polling or explicit refresh
      } catch (error) {
        console.error('[SSE] Failed to parse execution.paused event:', error);
      }
    });
    
    eventSource.addEventListener('execution.resumed', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Execution resumed:', data);
        // Trigger status refresh
      } catch (error) {
        console.error('[SSE] Failed to parse execution.resumed event:', error);
      }
    });
    
    eventSource.addEventListener('provider.health', (event) => {
      try {
        const data = JSON.parse(event.data);
        // Update provider in store
        // For now, trigger full providers refresh
        console.log('[SSE] Provider health update:', data);
      } catch (error) {
        console.error('[SSE] Failed to parse provider.health event:', error);
      }
    });
    
    eventSource.addEventListener('service.health', (event) => {
      try {
        const data = JSON.parse(event.data);
        // Update service in store
        console.log('[SSE] Service health update:', data);
      } catch (error) {
        console.error('[SSE] Failed to parse service.health event:', error);
      }
    });
    
    // Connection error - implement reconnection with exponential backoff
    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setSSEConnected(false);
      eventSource.close();
      
      // Calculate backoff delay (1s, 2s, 4s, 8s, 16s, max 30s)
      const maxDelay = 30000;
      const baseDelay = 1000;
      const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
      
      reconnectAttemptsRef.current++;
      
      console.log(`[SSE] Reconnecting in ${delay/1000}s (attempt ${reconnectAttemptsRef.current})`);
      
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  };
  
  useEffect(() => {
    // Initial connection
    connect();
    
    // Cleanup on unmount
    return () => {
      console.log('[SSE] Disconnecting from Vienna event stream');
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setSSEConnected(false);
    };
  }, []);
  
  return {
    connected: useDashboardStore((state) => state.sseConnected),
  };
}
