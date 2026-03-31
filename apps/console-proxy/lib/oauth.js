/**
 * OAuth Configuration (Google + GitHub)
 * Handles social login via Passport.js
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { query } = require('../database/client');
const jwt = require('jsonwebtoken');

// Initialize Passport
function initializeOAuth() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GITHUB_CLIENT_ID) {
    console.warn('[OAuth] Google or GitHub OAuth not configured. Social login disabled.');
    return;
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.API_URL || 'https://api.regulator.ai'}/api/v1/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await findOrCreateUser({
              provider: 'google',
              provider_id: profile.id,
              email: profile.emails[0]?.value,
              name: profile.displayName,
              avatar_url: profile.photos[0]?.value,
            });
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${process.env.API_URL || 'https://api.regulator.ai'}/api/v1/auth/github/callback`,
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await findOrCreateUser({
              provider: 'github',
              provider_id: profile.id,
              email: profile.emails[0]?.value,
              name: profile.displayName || profile.username,
              avatar_url: profile.photos[0]?.value,
            });
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Serialize/deserialize (not used in stateless JWT setup, but required by Passport)
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    // Not needed for JWT-based auth
    done(null, { id });
  });

  console.log('[OAuth] Initialized Google + GitHub strategies');
}

/**
 * Find or create user from OAuth profile
 */
async function findOrCreateUser({ provider, provider_id, email, name, avatar_url }) {
  if (!email) {
    throw new Error('Email is required from OAuth provider');
  }

  // Check if user exists by email
  let result = await query(
    `SELECT id, tenant_id, email, name, role FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length > 0) {
    const user = result.rows[0];

    // Update OAuth metadata if needed
    await query(
      `UPDATE users SET 
        oauth_provider = $1, 
        oauth_provider_id = $2, 
        avatar_url = COALESCE(avatar_url, $3),
        updated_at = NOW()
       WHERE id = $4`,
      [provider, provider_id, avatar_url, user.id]
    );

    return user;
  }

  // Create new user + tenant
  const tenant_id = `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Create tenant
  await query(
    `INSERT INTO tenants (id, name, created_at) 
     VALUES ($1, $2, NOW())`,
    [tenant_id, `${name}'s Organization`]
  );

  // Create user
  result = await query(
    `INSERT INTO users (
      tenant_id, email, name, role, 
      oauth_provider, oauth_provider_id, avatar_url, 
      email_verified, created_at
    ) VALUES ($1, $2, $3, 'admin', $4, $5, $6, true, NOW())
    RETURNING id, tenant_id, email, name, role`,
    [tenant_id, email, name, provider, provider_id, avatar_url]
  );

  console.log(`[OAuth] Created new user via ${provider}:`, email);

  return result.rows[0];
}

/**
 * Generate JWT for authenticated user
 */
function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  initializeOAuth,
  generateToken,
};
