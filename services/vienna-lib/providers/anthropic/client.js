/**
 * Anthropic Provider
 *
 * Direct Claude API integration for Vienna.
 * Enables Vienna to function independently of OpenClaw.
 */
import Anthropic from '@anthropic-ai/sdk';
export class AnthropicProvider {
    name = 'anthropic';
    type = 'anthropic';
    client;
    defaultModel;
    classificationModel;
    constructor(config) {
        this.client = new Anthropic({
            apiKey: config.apiKey,
        });
        this.defaultModel = config.defaultModel || 'claude-sonnet-4-5';
        this.classificationModel = config.classificationModel || 'claude-haiku-4-5-20251001';
        console.log(`[AnthropicProvider] Initialized with model: ${this.defaultModel}`);
    }
    /**
     * Health check (simple ping)
     */
    async isHealthy() {
        try {
            await this.client.messages.create({
                model: this.classificationModel, // Use fast model for health check
                max_tokens: 10,
                messages: [{ role: 'user', content: 'ping' }],
            });
            return true;
        }
        catch (error) {
            console.error('[AnthropicProvider] Health check failed:', error);
            return false;
        }
    }
    /**
     * Get provider status
     */
    async getStatus() {
        const start = Date.now();
        const healthy = await this.isHealthy();
        const latencyMs = Date.now() - start;
        return {
            name: this.name,
            healthy,
            last_heartbeat: new Date().toISOString(),
            latency_ms: healthy ? latencyMs : undefined,
            error: healthy ? undefined : 'API unreachable',
        };
    }
    /**
     * Send message
     */
    async sendMessage(request) {
        const messages = [
            ...(request.context?.conversation_history?.map(msg => ({
                role: msg.role === 'operator' ? 'user' : 'assistant',
                content: msg.content,
            })) || []),
            { role: 'user', content: request.message },
        ];
        const response = await this.client.messages.create({
            model: request.model || this.defaultModel,
            max_tokens: 4096,
            system: request.context?.system_prompt,
            messages,
            tools: request.context?.tools,
        });
        // Extract text content
        const textContent = response.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('');
        // Extract tool calls
        const toolCalls = response.content
            .filter(c => c.type === 'tool_use')
            .map(c => ({
            id: c.id,
            name: c.name,
            input: c.input,
        }));
        return {
            content: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            provider: this.name,
            model: response.model,
            tokens: {
                input: response.usage.input_tokens,
                output: response.usage.output_tokens,
            },
        };
    }
    /**
     * Stream message
     */
    async *streamMessage(request) {
        const messages = [
            ...(request.context?.conversation_history?.map(msg => ({
                role: msg.role === 'operator' ? 'user' : 'assistant',
                content: msg.content,
            })) || []),
            { role: 'user', content: request.message },
        ];
        const stream = await this.client.messages.create({
            model: request.model || this.defaultModel,
            max_tokens: 4096,
            system: request.context?.system_prompt,
            messages,
            stream: true,
        });
        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                yield {
                    type: 'text',
                    content: chunk.delta.text,
                };
            }
        }
    }
    /**
     * Classify message using fast Haiku model
     */
    async classifyMessage(message, context) {
        try {
            const response = await this.client.messages.create({
                model: this.classificationModel,
                max_tokens: 50,
                messages: [{
                        role: 'user',
                        content: `Classify this message into one of: informational, reasoning, directive, command, approval, recovery

Message: "${message}"

Reply with only the classification word.`,
                    }],
            });
            const classification = response.content[0].type === 'text'
                ? response.content[0].text.trim().toLowerCase()
                : 'informational';
            // Validate classification
            const validTypes = [
                'informational', 'reasoning', 'directive', 'command', 'approval', 'recovery'
            ];
            if (validTypes.includes(classification)) {
                return classification;
            }
            return 'informational';
        }
        catch (error) {
            console.error('[AnthropicProvider] Classification failed:', error);
            throw error;
        }
    }
    /**
     * Request reasoning
     */
    async requestReasoning(prompt, context) {
        const response = await this.sendMessage({
            message: prompt,
            context: {
                system_prompt: 'You are Vienna, an AI assistant helping with system operations and reasoning. Provide clear, structured analysis.',
                ...context,
            },
            operator: context?.operator || 'system',
        });
        return {
            content: response.content,
            provider: this.name,
            model: response.model,
        };
    }
}
//# sourceMappingURL=client.js.map