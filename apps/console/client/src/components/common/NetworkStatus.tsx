/**
 * Network Status Banner
 * 
 * Shows "Connection lost. Reconnecting..." when fetch fails
 */

import React, { useState, useEffect } from 'react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      setRetrying(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test connectivity periodically when offline
    let intervalId: NodeJS.Timeout | null = null;

    if (!isOnline && showBanner) {
      setRetrying(true);
      intervalId = setInterval(async () => {
        try {
          const response = await fetch('/api/v1/health', { 
            method: 'GET',
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
          });
          if (response.ok) {
            setIsOnline(true);
            setShowBanner(false);
            setRetrying(false);
          }
        } catch {
          // Still offline
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline, showBanner]);

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

  if (!showBanner) return null;

  return (
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
          {retrying ? 'Connection lost. Reconnecting...' : 'You appear to be offline'}
        </span>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}