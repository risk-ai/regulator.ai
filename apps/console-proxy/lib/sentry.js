/**
 * Sentry Error Tracking
 * Centralized error monitoring and alerting
 */

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (error) {
  console.warn('[Sentry] @sentry/node not installed, error tracking disabled');
}

let sentryInitialized = false;

/**
 * Initialize Sentry (call once on app startup)
 */
function initSentry() {
  if (sentryInitialized) return;
  
  if (!Sentry) {
    console.warn('[Sentry] Module not available, error tracking disabled');
    return;
  }
  
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN not configured, error tracking disabled');
    return;
  }
  
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Filter out common noise
    ignoreErrors: [
      'Network request failed',
      'AbortError',
      'timeout',
    ],
    
    beforeSend(event, hint) {
      // Don't send errors from health checks
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      
      // Add user context if available
      if (event.user?.id) {
        event.user = {
          id: event.user.id,
          email: event.user.email,
        };
      }
      
      return event;
    },
  });
  
  sentryInitialized = true;
  console.log('[Sentry] Initialized for environment:', process.env.NODE_ENV);
}

/**
 * Capture an exception
 */
function captureException(error, context = {}) {
  if (!sentryInitialized || !Sentry) {
    console.error('[Error]', error);
    return;
  }
  
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized || !Sentry) return;
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
function setUser(user) {
  if (!sentryInitialized || !Sentry) return;
  
  Sentry.setUser(user ? {
    id: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
  } : null);
}

/**
 * Express error handler middleware
 */
function errorHandler() {
  if (!sentryInitialized || !Sentry) {
    // Return passthrough middleware if Sentry not initialized
    return (err, req, res, next) => {
      console.error('[Error]', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    };
  }
  
  return Sentry.Handlers.errorHandler();
}

/**
 * Express request handler middleware
 */
function requestHandler() {
  if (!sentryInitialized || !Sentry) {
    return (req, res, next) => next();
  }
  
  return Sentry.Handlers.requestHandler();
}

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  errorHandler,
  requestHandler,
};
