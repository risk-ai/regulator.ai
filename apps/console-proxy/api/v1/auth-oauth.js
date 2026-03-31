/**
 * OAuth Routes (Google + GitHub)
 * Handles /auth/google and /auth/github callbacks
 */

const passport = require('passport');
const { generateToken } = require('../../lib/oauth');

module.exports = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Google OAuth initiation
  if (path === '/api/v1/auth/google') {
    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })(req, res);
  }

  // Google OAuth callback
  if (path === '/api/v1/auth/google/callback') {
    return passport.authenticate('google', { session: false }, (err, user) => {
      if (err || !user) {
        console.error('[OAuth] Google auth failed:', err);
        return res.redirect(
          `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/login?error=oauth_failed`
        );
      }

      const token = generateToken(user);
      
      // Redirect to console with token
      return res.redirect(
        `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/auth/callback?token=${token}`
      );
    })(req, res);
  }

  // GitHub OAuth initiation
  if (path === '/api/v1/auth/github') {
    return passport.authenticate('github', {
      scope: ['user:email'],
      session: false,
    })(req, res);
  }

  // GitHub OAuth callback
  if (path === '/api/v1/auth/github/callback') {
    return passport.authenticate('github', { session: false }, (err, user) => {
      if (err || !user) {
        console.error('[OAuth] GitHub auth failed:', err);
        return res.redirect(
          `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/login?error=oauth_failed`
        );
      }

      const token = generateToken(user);
      
      // Redirect to console with token
      return res.redirect(
        `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/auth/callback?token=${token}`
      );
    })(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
};
