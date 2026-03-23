/**
 * Commands API Client
 * 
 * Natural language command submission.
 */

import { apiClient } from './client.js';

export interface CommandSubmissionRequest {
  command: string;
  attachments?: string[];
  context?: Record<string, any>;
}

export interface CommandSubmissionResponse {
  objective_id: string;
  status: 'queued' | 'planning' | 'executing';
  command: string;
  attachments: string[];
  message: string;
}

/**
 * Submit command with optional attachments
 */
export async function submit(request: CommandSubmissionRequest): Promise<CommandSubmissionResponse> {
  return apiClient.post<CommandSubmissionResponse, CommandSubmissionRequest>(
    '/commands/submit',
    request
  );
}

export const commandsApi = {
  submit,
};
