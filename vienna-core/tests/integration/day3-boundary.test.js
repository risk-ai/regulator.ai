/**
 * Day 3 Authority Boundary Tests
 * 
 * Validates that chat routes and services respect authority boundaries.
 * No adapters may be imported in console code.
 */

const fs = require('fs');
const path = require('path');

describe('Day 3 Authority Boundary Tests', () => {
  
  /**
   * Test: Chat route does not import adapters
   */
  test('chat route does not import adapters', () => {
    const chatRoutePath = path.join(__dirname, '../../console/server/src/routes/chat.ts');
    
    if (fs.existsSync(chatRoutePath)) {
      const content = fs.readFileSync(chatRoutePath, 'utf8');
      
      expect(content).not.toContain("from '../../../lib/adapters");
      expect(content).not.toContain("from '../../adapters");
      expect(content).not.toContain('require(\'../adapters');
      expect(content).not.toContain('require(\'../../adapters');
    } else {
      // File will exist after TypeScript compilation
      console.warn('Chat route not found (expected for pre-build)');
    }
  });
  
  /**
   * Test: Chat service does not import adapters
   */
  test('chat service does not import adapters', () => {
    const chatServicePath = path.join(__dirname, '../../console/server/src/services/chatService.ts');
    
    if (fs.existsSync(chatServicePath)) {
      const content = fs.readFileSync(chatServicePath, 'utf8');
      
      expect(content).not.toContain("from '../../../lib/adapters");
      expect(content).not.toContain("from '../../adapters");
      expect(content).not.toContain('require(\'../adapters');
    }
  });
  
  /**
   * Test: Services route does not import adapters
   */
  test('services route does not import adapters', () => {
    const servicesRoutePath = path.join(__dirname, '../../console/server/src/routes/services.ts');
    
    if (fs.existsSync(servicesRoutePath)) {
      const content = fs.readFileSync(servicesRoutePath, 'utf8');
      
      expect(content).not.toContain("from '../../../lib/adapters");
      expect(content).not.toContain("from '../../adapters");
      expect(content).not.toContain('require(\'../adapters');
    }
  });
  
  /**
   * Test: Restart action does not bypass Vienna Core
   */
  test('restart action routes through Vienna Core', () => {
    const chatServicePath = path.join(__dirname, '../../console/server/src/services/chatService.ts');
    
    if (fs.existsSync(chatServicePath)) {
      const content = fs.readFileSync(chatServicePath, 'utf8');
      
      // Should call vienna.restartService (not direct service adapter)
      expect(content).toContain('vienna.restartService');
      expect(content).not.toContain('serviceAdapter.restart');
      expect(content).not.toContain('exec(\'systemctl restart');
    }
  });
  
  /**
   * Test: ChatService imports only allowed dependencies
   */
  test('ChatService imports only allowed dependencies', () => {
    const chatServicePath = path.join(__dirname, '../../console/server/src/services/chatService.ts');
    
    if (fs.existsSync(chatServicePath)) {
      const content = fs.readFileSync(chatServicePath, 'utf8');
      
      // Allowed imports
      expect(content).toContain('LayeredClassifier');
      expect(content).toContain('ProviderManager');
      expect(content).toContain('ViennaRuntimeService');
      
      // Forbidden imports
      expect(content).not.toContain('FileAdapter');
      expect(content).not.toContain('ShellAdapter');
      expect(content).not.toContain('require(\'child_process\')');
      expect(content).not.toContain('require(\'fs\')');
    }
  });
  
  /**
   * Test: All commands route through ViennaRuntimeService
   */
  test('all commands route through ViennaRuntimeService', () => {
    const chatServicePath = path.join(__dirname, '../../console/server/src/services/chatService.ts');
    
    if (fs.existsSync(chatServicePath)) {
      const content = fs.readFileSync(chatServicePath, 'utf8');
      
      // Commands should call vienna.method()
      expect(content).toContain('vienna.pauseExecution');
      expect(content).toContain('vienna.resumeExecution');
      expect(content).toContain('vienna.getSystemStatus');
      expect(content).toContain('vienna.getProviders');
      expect(content).toContain('vienna.getServices');
      expect(content).toContain('vienna.restartService');
    }
  });
  
  /**
   * Test: Chat route only imports service layer
   */
  test('chat route only imports service layer', () => {
    const chatRoutePath = path.join(__dirname, '../../console/server/src/routes/chat.ts');
    
    if (fs.existsSync(chatRoutePath)) {
      const content = fs.readFileSync(chatRoutePath, 'utf8');
      
      // Should import ChatService
      expect(content).toContain('ChatService');
      
      // Should NOT import Vienna Core directly
      expect(content).not.toContain('QueuedExecutor');
      expect(content).not.toContain('WarrantService');
      expect(content).not.toContain('TradingGuard');
    }
  });
  
  /**
   * Test: Authority boundary comments present
   */
  test('authority boundary comments present in routes', () => {
    const files = [
      'console/server/src/routes/chat.ts',
      'console/server/src/routes/services.ts',
      'console/server/src/services/chatService.ts',
    ];
    
    for (const file of files) {
      const filePath = path.join(__dirname, '../../', file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Should have authority boundary documentation
        expect(content.toLowerCase()).toMatch(/authority|boundary|governance/);
      }
    }
  });
});

// Run with: npx jest tests/integration/day3-boundary.test.js
