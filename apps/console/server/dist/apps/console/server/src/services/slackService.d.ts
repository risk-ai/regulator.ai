/**
 * Slack Integration Service
 * Phase 31, Feature 3
 */
export interface SlackWorkspace {
    id: string;
    tenant_id: string;
    team_id: string;
    team_name: string;
    access_token: string;
    bot_user_id?: string;
    webhook_url?: string;
    channel_approvals?: string;
    channel_alerts?: string;
    enabled: boolean;
    installed_at: Date;
}
export interface SlackNotification {
    id: string;
    workspace_id: string;
    tenant_id: string;
    type: string;
    entity_type: string;
    entity_id: string;
    channel_id: string;
    message_ts?: string;
    thread_ts?: string;
    sent_at: Date;
}
export declare class SlackService {
    /**
     * Send approval request to Slack
     */
    sendApprovalRequest(tenantId: string, approvalId: string, data: {
        agent_name: string;
        action_type: string;
        context: any;
    }): Promise<void>;
    /**
     * Send policy violation alert
     */
    sendPolicyViolation(tenantId: string, data: {
        agent_name: string;
        policy_name: string;
        action_type: string;
        violation_details: any;
    }): Promise<void>;
    /**
     * Send action completed notification
     */
    sendActionCompleted(tenantId: string, data: {
        agent_name: string;
        action_type: string;
        result: any;
    }): Promise<void>;
    /**
     * Get workspace for tenant
     */
    private getWorkspace;
    /**
     * Send message to Slack API
     */
    private sendMessage;
    /**
     * Install Slack workspace (OAuth callback)
     */
    installWorkspace(tenantId: string, code: string, userId: string): Promise<SlackWorkspace>;
}
export declare const slackService: SlackService;
//# sourceMappingURL=slackService.d.ts.map