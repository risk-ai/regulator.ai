/**
 * Test auth endpoint to debug bcrypt
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const bcrypt = require('bcryptjs');
    
    // Test hash generation
    const password = 'demo';
    const hash = await bcrypt.hash(password, 10);
    const valid = await bcrypt.compare(password, hash);
    
    // Test with the DB hash
    const dbHash = '$2b$10$bHxZoJPJrj2zCzLy24nBguspT05XQZw5790pAebYDn8PE3hId2Hm.';
    const dbValid = await bcrypt.compare(password, dbHash);
    
    return res.json({
      bcryptAvailable: true,
      testHash: hash,
      testValid: valid,
      dbHashValid: dbValid,
      version: bcrypt.getRounds ? bcrypt.getRounds(hash) : 'unknown'
    });
    
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      bcryptAvailable: false
    });
  }
}
