/**
 * Network Status Banner
 * 
 * Shows "Connection lost. Reconnecting..." when fetch fails
 */

import React, { useState, useEffect } from 'react';

type ConnectionQuality = 'good' | 'poor' | 'offline';

interface NetworkState {
  isOnline: boolean;
  quality: ConnectionQuality;
  reconnectAttempts: number;
  lastHealthCheck: number | null;
}

export function NetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    quality: 'good',
    reconnectAttempts: 0,
    lastHealthCheck: null
  });
  const [showBanner, setShowBanner] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const checkHealth = async (): Promise<{ success: boolean; latency: number }> => {
    const startTime = Date.now();
    try {
      // Use a longer timeout — Vercel serverless cold starts can take 5-10s
      const response = await fetch('/api/v1/health', { 
        method: 'GET',
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(15000)
      });
      const latency = Date.now() - startTime;
      return { success: response.ok, latency };
    } catch {
      return { success: false, latency: Date.now() - startTime };
    }
  };

  const determineQuality = (latency: number): ConnectionQuality => {
    if (latency < 500) return 'good';
    if (latency < 2000) return 'poor';
    return 'offline';
  };

  useEffect(() => {
    const handleOnline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: true, reconnectAttempts: 0 }));
      setShowBanner(false);
      setRetrying(false);
    };

    const handleOffline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: false, quality: 'offline' }));
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic health checks
    const healthCheckInterval = setInterval(async () => {
      const { success, latency } = await checkHealth();
      const quality = success ? determineQuality(latency) : 'offline';
      
      setNetworkState(prev => {
        const newAttempts = success ? 0 : prev.reconnectAttempts + 1;
        return {
          ...prev,
          isOnline: navigator.onLine && success,
          quality,
          lastHealthCheck: Date.now(),
          reconnectAttempts: newAttempts
        };
      });

      // Only show banner after 3 consecutive failures (avoids cold-start false alarms)
      if (!success) {
        setNetworkState(prev => {
          if (prev.reconnectAttempts >= 3 && !showBanner) {
            setShowBanner(true);
            setRetrying(true);
          }
          return prev;
        });
      } else if (success && showBanner) {
        setShowBanner(false);
        setRetrying(false);
      }
    }, 30000); // Check every 30 seconds (was 10s — too aggressive for serverless)

    // Initial health check
    checkHealth().then(({ success, latency }) => {
      const quality = success ? determineQuality(latency) : 'offline';
      setNetworkState(prev => ({
        ...prev,
        isOnline: navigator.onLine && success,
        quality,
        lastHealthCheck: Date.now()
      }));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheckInterval);
    };
  }, [showBanner]);

  // Also show banner on fetch failures
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // If we were showing banner and got a successful response, hide it
        if (showBanner && response.ok) {
          setShowBanner(false);
          setRetrying(false);
        }
        
        // If request failed due to network, show banner
        if (!response.ok && response.status >= 500) {
          setShowBanner(true);
          setRetrying(true);
        }
        
        return response;
      } catch (error) {
        // Network error - show banner
        setShowBanner(true);
        setRetrying(true);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [showBanner]);

  const getQualityIndicator = () => {
    const baseStyles = {
      position: 'fixed' as const,
      top: '12px',
      right: '12px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      zIndex: 9998,
      boxShadow: '0 0 0 2px rgba(0,0,0,0.2)'
    };

    switch (networkState.quality) {
      case 'good':
        return (
          <div
            style={{
              ...baseStyles,
              background: '#10b981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)'
            }}
            title="Connection: Good"
          />
        );
      case 'poor':
        return (
          <div
            style={{
              ...baseStyles,
              background: '#f59e0b',
              boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.3)'
            }}
            title="Connection: Poor"
          />
        );
      case 'offline':
        return (
          <div
            style={{
              ...baseStyles,
              background: '#ef4444',
              boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.3)'
            }}
            title="Connection: Offline"
          />
        );
    }
  };

  if (!showBanner) {
    return getQualityIndicator();
  }

  return (
    <>
      {getQualityIndicator()}
      
      {/* Banner */}
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'linear-gradient(90deg, #f59e0b, #d97706)',
      color: 'white',
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 500,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {retrying && (
          <div style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        )}
        <span>
          {retrying 
            ? `Connection lost. Reconnecting... (attempt ${networkState.reconnectAttempts})`
            : 'You appear to be offline'
          }
        </span>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </>
  );
}