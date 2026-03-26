/**
 * Webhook Integration Adapter — Vienna OS
 * 
 * Generic HTTP webhook dispatcher with HMAC signing and retry logic.
 */

import crypto from 'crypto';
import type { IntegrationAdapter, IntegrationEvent, ConfigSchema } from './types.js';

function signPayload(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number,
  timeoutMs: number
): Promise<{ response?: Response; error?: string }> {
  let lastError: string = '';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      // Treat 2xx as success, don't retry
      if (response.ok) return { response };
      // Retry on 5xx, not on 4xx
      if (response.status < 500 && response.status >= 400) return { response };
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = `Timeout after ${timeoutMs}ms`;
      }
    }

    // Exponential backoff before retry
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  return { error: `Failed after ${retries + 1} attempts: ${lastError}` };
}

export const webhookAdapter: IntegrationAdapter = {
  type: 'webhook',

  validateConfig(config) {
    const errors: string[] = [];
    if (!config.url) errors.push('Webhook URL is required');
    if (config.url && !config.url.startsWith('http')) errors.push('URL must start with http:// or https://');
    if (config.method && !['GET', 'POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase())) {
      errors.push('Method must be GET, POST, PUT, or PATCH');
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async sendNotification(event, config) {
    const method = (config.method || 'POST').toUpperCase();
    const timeoutMs = config.timeout_ms || 10000;
    const retries = config.retry_count ?? 2;
    const body = JSON.stringify({
      event: event.type,
      data: event.data,
      source: 'vienna-os',
      timestamp: event.data.timestamp,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vienna-OS/1.0',
      ...(config.headers || {}),
    };

    // HMAC signature
    if (config.hmac_secret) {
      headers['X-Vienna-Signature'] = `sha256=${signPayload(body, config.hmac_secret)}`;
    }

    // Auth
    if (config.auth_type === 'bearer' && config.auth_value) {
      headers['Authorization'] = `Bearer ${config.auth_value}`;
    } else if (config.auth_type === 'basic' && config.auth_value) {
      headers['Authorization'] = `Basic ${Buffer.from(config.auth_value).toString('base64')}`;
    } else if (config.auth_type === 'header' && config.auth_header && config.auth_value) {
      headers[config.auth_header] = config.auth_value;
    }

    const fetchOptions: RequestInit = { method, headers };
    if (method !== 'GET') fetchOptions.body = body;

    const result = await fetchWithRetry(config.url, fetchOptions, retries, timeoutMs);

    if (result.error) {
      return { success: false, error: result.error };
    }

    const response = result.response!;
    const responseBody = await response.text().catch(() => '');

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseBody.slice(0, 200)}`,
        response: { status: response.status, body: responseBody },
      };
    }

    return { success: true, response: { status: response.status, body: responseBody } };
  },

  async testConnection(config) {
    const validation = this.validateConfig(config);
    if (!validation.valid) return { success: false, message: validation.errors!.join(', ') };

    const testEvent: IntegrationEvent = {
      type: 'alert',
      data: {
        summary: 'Vienna OS webhook test',
        timestamp: new Date().toISOString(),
        details: { test: true },
      },
    };

    const result = await this.sendNotification(testEvent, config);
    return result.success
      ? { success: true, message: `Webhook responded with ${result.response?.status || 'OK'}` }
      : { success: false, message: result.error || 'Test failed' };
  },
};

export const webhookConfigSchema: ConfigSchema = {
  type: 'webhook',
  label: 'Webhook',
  description: 'Send governance events to any HTTP endpoint with HMAC signing and retry',
  icon: '🔗',
  fields: [
    { key: 'url', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://api.yourservice.com/webhook' },
    { key: 'method', label: 'HTTP Method', type: 'select', required: false, options: [{ value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }] },
    { key: 'hmac_secret', label: 'HMAC Secret', type: 'password', required: false, help: 'Signs payload in X-Vienna-Signature header (SHA256)' },
    { key: 'auth_type', label: 'Auth Type', type: 'select', required: false, options: [{ value: 'none', label: 'None' }, { value: 'bearer', label: 'Bearer Token' }, { value: 'basic', label: 'Basic Auth' }, { value: 'header', label: 'Custom Header' }] },
    { key: 'auth_value', label: 'Auth Value', type: 'password', required: false, help: 'Token, user:pass, or header value' },
    { key: 'auth_header', label: 'Auth Header Name', type: 'text', required: false, placeholder: 'X-API-Key', help: 'For custom header auth' },
    { key: 'retry_count', label: 'Retry Count', type: 'number', required: false, placeholder: '2' },
    { key: 'timeout_ms', label: 'Timeout (ms)', type: 'number', required: false, placeholder: '10000' },
  ],
};
