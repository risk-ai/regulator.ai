/**
 * Chat History Persistence Tests
 * 
 * Verifies that chat messages are persisted correctly across requests.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

describe('Chat History Persistence', () => {
  const BASE_URL = 'http://localhost:3100';
  let testThreadId = null;
  
  async function isServerRunning() {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  beforeAll(async () => {
    if (!await isServerRunning()) {
      console.warn('Server not running on localhost:3100, skipping HTTP tests');
    }
  });
  
  describe('POST /api/v1/chat/message', () => {
    test('creates thread when no threadId provided', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'show status',
          operator: 'test-operator',
        }),
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.threadId).toBeDefined();
      expect(typeof data.data.threadId).toBe('string');
      expect(data.data.threadId).toMatch(/^thread_/);
      
      // Save for next test
      testThreadId = data.data.threadId;
    });
    
    test('appends to existing thread when threadId provided', async () => {
      if (!await isServerRunning() || !testThreadId) return;
      
      // Send second message to same thread
      const response = await fetch(`${BASE_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'show providers',
          operator: 'test-operator',
          threadId: testThreadId,
        }),
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.threadId).toBe(testThreadId);
    });
  });
  
  describe('GET /api/v1/chat/history', () => {
    test('returns persisted messages in order', async () => {
      if (!await isServerRunning() || !testThreadId) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/chat/history?threadId=${testThreadId}`);
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.threadId).toBe(testThreadId);
      expect(Array.isArray(data.data.messages)).toBe(true);
      expect(data.data.messages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
      
      // Verify chronological order
      for (let i = 1; i < data.data.messages.length; i++) {
        const prevTime = new Date(data.data.messages[i-1].timestamp);
        const currTime = new Date(data.data.messages[i].timestamp);
        expect(currTime >= prevTime).toBe(true);
      }
    });
    
    test('messages retain metadata', async () => {
      if (!await isServerRunning() || !testThreadId) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/chat/history?threadId=${testThreadId}`);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      for (const message of data.data.messages) {
        // Required fields
        expect(message.messageId).toBeDefined();
        expect(message.threadId).toBe(testThreadId);
        expect(message.classification).toBeDefined();
        expect(message.provider).toBeDefined();
        expect(message.provider.name).toBeDefined();
        expect(message.provider.mode).toBeDefined();
        expect(message.status).toBeDefined();
        expect(message.content).toBeDefined();
        expect(message.content.text).toBeDefined();
        expect(message.timestamp).toBeDefined();
      }
    });
    
    test('requires threadId parameter', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/chat/history`);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_REQUEST');
    });
  });
  
  describe('GET /api/v1/chat/threads', () => {
    test('returns list of threads', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/chat/threads`);
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.threads).toBeDefined();
      expect(Array.isArray(data.data.threads)).toBe(true);
      expect(data.data.threads.length).toBeGreaterThan(0);
      
      // Check thread structure
      const thread = data.data.threads[0];
      expect(thread.threadId).toBeDefined();
      expect(thread.messageCount).toBeDefined();
      expect(thread.createdAt).toBeDefined();
      expect(thread.updatedAt).toBeDefined();
      expect(thread.status).toBeDefined();
    });
    
    test('orders threads by most recent', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/chat/threads`);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      // Verify descending order by updatedAt
      for (let i = 1; i < data.data.threads.length; i++) {
        const prevTime = new Date(data.data.threads[i-1].updatedAt);
        const currTime = new Date(data.data.threads[i].updatedAt);
        expect(prevTime >= currTime).toBe(true);
      }
    });
  });
  
  describe('Persistence across "refreshes"', () => {
    test('can reconstruct thread after simulated refresh', async () => {
      if (!await isServerRunning() || !testThreadId) return;
      
      // Simulate refresh: get thread list
      const threadsResponse = await fetch(`${BASE_URL}/api/v1/chat/threads`);
      const threadsData = await threadsResponse.json();
      
      expect(threadsData.success).toBe(true);
      
      // Find our test thread
      const thread = threadsData.data.threads.find(t => t.threadId === testThreadId);
      expect(thread).toBeDefined();
      expect(thread.messageCount).toBeGreaterThan(0);
      
      // Get history for that thread
      const historyResponse = await fetch(`${BASE_URL}/api/v1/chat/history?threadId=${testThreadId}`);
      const historyData = await historyResponse.json();
      
      expect(historyData.success).toBe(true);
      expect(historyData.data.messages.length).toBe(thread.messageCount);
    });
  });
  
  describe('Metadata persistence', () => {
    test('classification persists correctly', async () => {
      if (!await isServerRunning()) return;
      
      // Send command message
      const response = await fetch(`${BASE_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'resume execution',
          operator: 'test-operator',
        }),
      });
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      const commandThreadId = data.data.threadId;
      
      // Retrieve history
      const historyResponse = await fetch(`${BASE_URL}/api/v1/chat/history?threadId=${commandThreadId}`);
      const historyData = await historyResponse.json();
      
      // Find assistant message
      const assistantMsg = historyData.data.messages.find(m => m.classification === 'command');
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg.provider.mode).toBe('deterministic');
    });
    
    test('action metadata persists', async () => {
      if (!await isServerRunning()) return;
      
      // Send pause command
      const response = await fetch(`${BASE_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'pause execution',
          operator: 'test-operator',
        }),
      });
      
      const data = await response.json();
      const pauseThreadId = data.data.threadId;
      
      // Retrieve history
      const historyResponse = await fetch(`${BASE_URL}/api/v1/chat/history?threadId=${pauseThreadId}`);
      const historyData = await historyResponse.json();
      
      // Find assistant message with action
      const assistantMsg = historyData.data.messages.find(
        m => m.classification === 'command' && m.actionTaken
      );
      
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg.actionTaken).toBeDefined();
      expect(assistantMsg.actionTaken.action).toBe('pause_execution');
      expect(assistantMsg.actionTaken.result).toBe('success');
    });
  });
  
  describe('Architecture boundaries', () => {
    test('routes do not access persistence directly', async () => {
      const routePath = path.join(__dirname, '../../console/server/src/routes/chat.ts');
      
      if (!fs.existsSync(routePath)) {
        console.warn('Route file not found, skipping boundary test');
        return;
      }
      
      const content = fs.readFileSync(routePath, 'utf-8');
      
      // Routes should NOT import ChatHistoryService directly
      expect(content).not.toMatch(/from.*chatHistoryService/i);
      
      // Routes should import ChatService
      expect(content).toMatch(/ChatService/);
    });
    
    test('persistence service is isolated', async () => {
      const servicePath = path.join(__dirname, '../../console/server/src/services/chatHistoryService.ts');
      
      if (!fs.existsSync(servicePath)) {
        console.warn('Service file not found, skipping isolation test');
        return;
      }
      
      const content = fs.readFileSync(servicePath, 'utf-8');
      
      // History service should import better-sqlite3
      expect(content).toMatch(/from ['"]better-sqlite3['"]/);
      
      // History service should NOT import Vienna Core directly
      expect(content).not.toMatch(/from.*vienna-core/i);
      expect(content).not.toMatch(/from.*index\.js/);
    });
  });
});
