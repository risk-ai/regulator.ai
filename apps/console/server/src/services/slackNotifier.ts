/**
 * Slack Notifier Service
 * Specialized service for sending T1/T2/T3 approval notifications
 */

import { slackService, SlackApprovalMessage } from './slackService.js';

export interface SlackApprovalMessageInput {
  channel: string;
  action: string;
  agent_id: string;
  risk_tier: string;
  execution_id: string;
  details: string;
  warrant_id?: string;
}

export class SlackNotifier {
  /**
   * Send T1/T2/T3 approval request to Slack
   */
  async sendApprovalNotification(
    tenantId: string,
    messageData: SlackApprovalMessageInput
  ): Promise<void> {
    // Validate risk tier
    if (!this.isApprovalRequired(messageData.risk_tier)) {
      console.log(`[SlackNotifier] No approval required for risk tier: ${messageData.risk_tier}`);
      return;
    }

    try {
      await slackService.sendApprovalRequest(tenantId, messageData.execution_id, messageData);
      console.log(`[SlackNotifier] Approval request sent for execution ${messageData.execution_id}`);
    } catch (error) {
      console.error('[SlackNotifier] Failed to send approval notification:', error);
      throw error;
    }
  }

  /**
   * Send anomaly alert to Slack
   */
  async sendAnomalyAlert(
    tenantId: string,
    data: {
      agent_id: string;
      anomaly_type: string;
      severity: string;
      description: string;
      details?: any;
    }
  ): Promise<void> {
    try {
      await slackService.sendPolicyViolation(tenantId, {
        agent_name: data.agent_id,
        policy_name: `Anomaly Detection: ${data.anomaly_type}`,
        action_type: data.severity,
        violation_details: {
          description: data.description,
          ...data.details,
        },
      });
      console.log(`[SlackNotifier] Anomaly alert sent for ${data.anomaly_type}`);
    } catch (error) {
      console.error('[SlackNotifier] Failed to send anomaly alert:', error);
      throw error;
    }
  }

  /**
   * Send execution status update
   */
  async sendExecutionUpdate(
    tenantId: string,
    data: {
      execution_id: string;
      agent_id: string;
      status: 'completed' | 'failed' | 'timeout';
      action: string;
      result?: any;
      error?: string;
    }
  ): Promise<void> {
    try {
      if (data.status === 'completed') {
        await slackService.sendActionCompleted(tenantId, {
          agent_name: data.agent_id,
          action_type: data.action,
          result: data.result || { status: 'success' },
        });
      } else {
        // Send failure/timeout notification
        await slackService.sendPolicyViolation(tenantId, {
          agent_name: data.agent_id,
          policy_name: `Execution ${data.status.toUpperCase()}`,
          action_type: data.action,
          violation_details: {
            execution_id: data.execution_id,
            error: data.error,
            status: data.status,
          },
        });
      }
      console.log(`[SlackNotifier] Execution update sent: ${data.status} for ${data.execution_id}`);
    } catch (error) {
      console.error('[SlackNotifier] Failed to send execution update:', error);
      throw error;
    }
  }

  /**
   * Check if approval is required for given risk tier
   */
  private isApprovalRequired(riskTier: string): boolean {
    const approvalTiers = ['T1', 'T2', 'T3'];
    return approvalTiers.includes(riskTier?.toUpperCase());
  }

  /**
   * Format details for Slack display
   */
  private formatDetails(details: any): string {
    if (typeof details === 'string') {
      return details;
    }

    if (typeof details === 'object') {
      // Pretty format key-value pairs
      return Object.entries(details)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('\n');
    }

    return JSON.stringify(details, null, 2);
  }
}

export const slackNotifier = new SlackNotifier();