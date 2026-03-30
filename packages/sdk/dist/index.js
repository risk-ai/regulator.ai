"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ApprovalsModule: () => ApprovalsModule,
  ComplianceModule: () => ComplianceModule,
  FleetModule: () => FleetModule,
  IntegrationsModule: () => IntegrationsModule,
  IntentModule: () => IntentModule,
  PoliciesModule: () => PoliciesModule,
  ViennaAuthError: () => ViennaAuthError,
  ViennaClient: () => ViennaClient,
  ViennaError: () => ViennaError,
  ViennaForbiddenError: () => ViennaForbiddenError,
  ViennaNotFoundError: () => ViennaNotFoundError,
  ViennaRateLimitError: () => ViennaRateLimitError,
  ViennaServerError: () => ViennaServerError,
  ViennaValidationError: () => ViennaValidationError,
  createForAutoGen: () => createForAutoGen,
  createForCrewAI: () => createForCrewAI,
  createForLangChain: () => createForLangChain,
  createForOpenClaw: () => createForOpenClaw
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
var ViennaError = class extends Error {
  /** Machine-readable error code from the API (e.g. `POLICY_VIOLATION`). */
  code;
  /** HTTP status code. */
  status;
  /** Additional error details from the API response. */
  details;
  constructor(message, status, code, details) {
    super(message);
    this.name = "ViennaError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var ViennaAuthError = class extends ViennaError {
  constructor(message, code = "UNAUTHORIZED", details) {
    super(message, 401, code, details);
    this.name = "ViennaAuthError";
  }
};
var ViennaForbiddenError = class extends ViennaError {
  constructor(message, code = "FORBIDDEN", details) {
    super(message, 403, code, details);
    this.name = "ViennaForbiddenError";
  }
};
var ViennaNotFoundError = class extends ViennaError {
  constructor(message, code = "NOT_FOUND", details) {
    super(message, 404, code, details);
    this.name = "ViennaNotFoundError";
  }
};
var ViennaRateLimitError = class extends ViennaError {
  /** Seconds to wait before retrying. */
  retryAfter;
  constructor(message, retryAfter, code = "RATE_LIMITED", details) {
    super(message, 429, code, details);
    this.name = "ViennaRateLimitError";
    this.retryAfter = retryAfter;
  }
};
var ViennaValidationError = class extends ViennaError {
  /** Field-level validation errors. */
  fields;
  constructor(message, code = "VALIDATION_ERROR", fields, details) {
    super(message, 400, code, details);
    this.name = "ViennaValidationError";
    this.fields = fields;
  }
};
var ViennaServerError = class extends ViennaError {
  constructor(message, status = 500, code = "SERVER_ERROR", details) {
    super(message, status, code, details);
    this.name = "ViennaServerError";
  }
};

// src/utils.ts
var SDK_VERSION = "0.1.0";
var DEFAULT_BASE_URL = "https://vienna-os.fly.dev";
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_RETRIES = 3;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function backoffDelay(attempt, baseMs = 1e3) {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseMs;
  return Math.min(exponential + jitter, 3e4);
}
function isRetryable(status) {
  return status === 429 || status >= 500;
}
async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throwHttpError(response.status, response.statusText, "NON_JSON_ERROR");
    }
    return void 0;
  }
  const body = await response.json();
  if (!response.ok || !body.success) {
    const message = body.error ?? response.statusText ?? "Unknown error";
    const code = body.code ?? "UNKNOWN";
    throwHttpError(response.status, message, code, body.data);
  }
  return body.data;
}
function throwHttpError(status, message, code, details) {
  switch (status) {
    case 400:
      throw new ViennaValidationError(
        message,
        code,
        typeof details === "object" && details !== null ? details : void 0,
        details
      );
    case 401:
      throw new ViennaAuthError(message, code, details);
    case 403:
      throw new ViennaForbiddenError(message, code, details);
    case 404:
      throw new ViennaNotFoundError(message, code, details);
    case 429:
      throw new ViennaRateLimitError(message, 0, code, details);
    default:
      if (status >= 500) {
        throw new ViennaServerError(message, status, code, details);
      }
      throw new ViennaError(message, status, code, details);
  }
}
function buildQuery(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== void 0 && v !== null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length > 0 ? `?${entries.join("&")}` : "";
}

// src/intent.ts
var IntentModule = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Submit an agent intent for governance evaluation and execution.
   *
   * @param intent  - The intent request describing the action.
   * @param options - Optional request options (signal, timeout).
   * @returns The intent result including status, risk tier, and policy matches.
   */
  async submit(intent, options) {
    return this.client.request("POST", "/api/v1/intents", intent, options);
  }
  /**
   * Check the current status of a previously submitted intent.
   *
   * @param intentId - The intent identifier (e.g. `int-abc123`).
   * @param options  - Optional request options.
   * @returns Full intent status including audit trail references.
   */
  async status(intentId, options) {
    return this.client.request("GET", `/api/v1/intents/${encodeURIComponent(intentId)}`, void 0, options);
  }
  /**
   * Simulate an intent without executing it (dry-run).
   * Useful for testing policy configurations and understanding governance outcomes.
   *
   * @param intent  - The intent to simulate.
   * @param options - Optional request options.
   * @returns Simulation result showing what would happen.
   */
  async simulate(intent, options) {
    return this.client.request("POST", "/api/v1/intents/simulate", intent, options);
  }
};

// src/policies.ts
var PoliciesModule = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * List all policies, optionally filtered.
   *
   * @param params  - Filter parameters.
   * @param options - Optional request options.
   * @returns Array of policy rules.
   */
  async list(params, options) {
    const query = buildQuery(params ?? {});
    return this.client.request("GET", `/api/v1/policies${query}`, void 0, options);
  }
  /**
   * Get a single policy by ID.
   *
   * @param policyId - The policy identifier.
   * @param options  - Optional request options.
   * @returns The policy rule.
   */
  async get(policyId, options) {
    return this.client.request("GET", `/api/v1/policies/${encodeURIComponent(policyId)}`, void 0, options);
  }
  /**
   * Create a new governance policy.
   *
   * @param params  - Policy creation parameters.
   * @param options - Optional request options.
   * @returns The created policy rule.
   */
  async create(params, options) {
    return this.client.request("POST", "/api/v1/policies", params, options);
  }
  /**
   * Update an existing policy.
   *
   * @param policyId - The policy identifier.
   * @param params   - Fields to update.
   * @param options  - Optional request options.
   * @returns The updated policy rule.
   */
  async update(policyId, params, options) {
    return this.client.request("PATCH", `/api/v1/policies/${encodeURIComponent(policyId)}`, params, options);
  }
  /**
   * Delete a policy.
   *
   * @param policyId - The policy identifier.
   * @param options  - Optional request options.
   */
  async delete(policyId, options) {
    await this.client.request("DELETE", `/api/v1/policies/${encodeURIComponent(policyId)}`, void 0, options);
  }
  /**
   * Evaluate policies against a test payload (dry-run).
   * Returns which policies would match and what action would be taken.
   *
   * @param payload - The test payload to evaluate.
   * @param options - Optional request options.
   * @returns Evaluation result with matched policies and final action.
   */
  async evaluate(payload, options) {
    return this.client.request("POST", "/api/v1/policies/evaluate", payload, options);
  }
  /**
   * List available industry policy templates.
   *
   * @param options - Optional request options.
   * @returns Array of policy templates.
   */
  async templates(options) {
    return this.client.request("GET", "/api/v1/policies/templates", void 0, options);
  }
};

// src/fleet.ts
var FleetModule = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * List all agents in the fleet.
   *
   * @param options - Optional request options.
   * @returns Array of fleet agents.
   */
  async list(options) {
    return this.client.request("GET", "/api/v1/fleet", void 0, options);
  }
  /**
   * Get a single agent by ID.
   *
   * @param agentId - The agent identifier.
   * @param options - Optional request options.
   * @returns The fleet agent.
   */
  async get(agentId, options) {
    return this.client.request("GET", `/api/v1/fleet/${encodeURIComponent(agentId)}`, void 0, options);
  }
  /**
   * Get metrics for a specific agent.
   *
   * @param agentId - The agent identifier.
   * @param options - Optional request options.
   * @returns Agent performance metrics.
   */
  async metrics(agentId, options) {
    return this.client.request("GET", `/api/v1/fleet/${encodeURIComponent(agentId)}/metrics`, void 0, options);
  }
  /**
   * Get paginated activity log for an agent.
   *
   * @param agentId    - The agent identifier.
   * @param pagination - Pagination parameters.
   * @param options    - Optional request options.
   * @returns Paginated list of agent activities.
   */
  async activity(agentId, pagination, options) {
    const query = buildQuery(pagination ?? {});
    return this.client.request(
      "GET",
      `/api/v1/fleet/${encodeURIComponent(agentId)}/activity${query}`,
      void 0,
      options
    );
  }
  /**
   * Suspend an agent, preventing it from submitting intents.
   *
   * @param agentId - The agent identifier.
   * @param params  - Suspension details.
   * @param options - Optional request options.
   * @returns The updated agent.
   */
  async suspend(agentId, params, options) {
    return this.client.request(
      "POST",
      `/api/v1/fleet/${encodeURIComponent(agentId)}/suspend`,
      params,
      options
    );
  }
  /**
   * Reactivate a suspended agent.
   *
   * @param agentId - The agent identifier.
   * @param options - Optional request options.
   * @returns The updated agent.
   */
  async activate(agentId, options) {
    return this.client.request(
      "POST",
      `/api/v1/fleet/${encodeURIComponent(agentId)}/activate`,
      void 0,
      options
    );
  }
  /**
   * Manually adjust an agent's trust score.
   *
   * @param agentId - The agent identifier.
   * @param params  - New trust score and reason.
   * @param options - Optional request options.
   * @returns The updated agent.
   */
  async setTrust(agentId, params, options) {
    return this.client.request(
      "PUT",
      `/api/v1/fleet/${encodeURIComponent(agentId)}/trust`,
      params,
      options
    );
  }
  /**
   * List fleet-wide alerts.
   *
   * @param params  - Filter parameters.
   * @param options - Optional request options.
   * @returns Array of fleet alerts.
   */
  async alerts(params, options) {
    const query = buildQuery(params ?? {});
    return this.client.request("GET", `/api/v1/fleet/alerts${query}`, void 0, options);
  }
  /**
   * Resolve a fleet alert.
   *
   * @param alertId - The alert identifier.
   * @param params  - Resolution details.
   * @param options - Optional request options.
   * @returns The resolved alert.
   */
  async resolveAlert(alertId, params, options) {
    return this.client.request(
      "POST",
      `/api/v1/fleet/alerts/${encodeURIComponent(alertId)}/resolve`,
      params,
      options
    );
  }
};

// src/approvals.ts
var ApprovalsModule = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * List approvals, optionally filtered by status or source.
   *
   * @param params  - Filter parameters.
   * @param options - Optional request options.
   * @returns Array of approvals.
   */
  async list(params, options) {
    const query = buildQuery(params ?? {});
    return this.client.request("GET", `/api/v1/approvals${query}`, void 0, options);
  }
  /**
   * Get a single approval by ID.
   *
   * @param approvalId - The approval identifier.
   * @param options    - Optional request options.
   * @returns The approval.
   */
  async get(approvalId, options) {
    return this.client.request("GET", `/api/v1/approvals/${encodeURIComponent(approvalId)}`, void 0, options);
  }
  /**
   * Approve a pending action.
   *
   * @param approvalId - The approval identifier.
   * @param params     - Approval details (operator, optional notes).
   * @param options    - Optional request options.
   * @returns The updated approval.
   */
  async approve(approvalId, params, options) {
    return this.client.request(
      "POST",
      `/api/v1/approvals/${encodeURIComponent(approvalId)}/approve`,
      params,
      options
    );
  }
  /**
   * Deny a pending action.
   *
   * @param approvalId - The approval identifier.
   * @param params     - Denial details (operator, reason).
   * @param options    - Optional request options.
   * @returns The updated approval.
   */
  async deny(approvalId, params, options) {
    return this.client.request(
      "POST",
      `/api/v1/approvals/${encodeURIComponent(approvalId)}/deny`,
      params,
      options
    );
  }
};

// src/integrations.ts
var IntegrationsModule = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * List all configured integrations.
   *
   * @param options - Optional request options.
   * @returns Array of integrations.
   */
  async list(options) {
    return this.client.request("GET", "/api/v1/integrations", void 0, options);
  }
  /**
   * Get a single integration by ID.
   *
   * @param integrationId - The integration identifier.
   * @param options       - Optional request options.
   * @returns The integration.
   */
  async get(integrationId, options) {
    return this.client.request(
      "GET",
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      void 0,
      options
    );
  }
  /**
   * Create a new integration.
   *
   * @param params  - Integration configuration.
   * @param options - Optional request options.
   * @returns The created integration.
   */
  async create(params, options) {
    return this.client.request("POST", "/api/v1/integrations", params, options);
  }
  /**
   * Update an existing integration.
   *
   * @param integrationId - The integration identifier.
   * @param params        - Fields to update.
   * @param options       - Optional request options.
   * @returns The updated integration.
   */
  async update(integrationId, params, options) {
    return this.client.request(
      "PATCH",
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      params,
      options
    );
  }
  /**
   * Delete an integration.
   *
   * @param integrationId - The integration identifier.
   * @param options       - Optional request options.
   */
  async delete(integrationId, options) {
    await this.client.request(
      "DELETE",
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      void 0,
      options
    );
  }
  /**
   * Send a test event to an integration to verify connectivity.
   *
   * @param integrationId - The integration identifier.
   * @param options       - Optional request options.
   * @returns Test result with success status and latency.
   */
  async test(integrationId, options) {
    return this.client.request(
      "POST",
      `/api/v1/integrations/${encodeURIComponent(integrationId)}/test`,
      void 0,
      options
    );
  }
  /**
   * Toggle an integration's enabled/disabled state.
   *
   * @param integrationId - The integration identifier.
   * @param params        - Enable or disable.
   * @param options       - Optional request options.
   * @returns The updated integration.
   */
  async toggle(integrationId, params, options) {
    return this.client.request(
      "PATCH",
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      params,
      options
    );
  }
};

// src/compliance.ts
var ComplianceModule = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Generate a new compliance report.
   *
   * @param params  - Report parameters (type, period).
   * @param options - Optional request options.
   * @returns The created report (may still be generating).
   */
  async generate(params, options) {
    return this.client.request("POST", "/api/v1/compliance/reports", params, options);
  }
  /**
   * Get a compliance report by ID.
   *
   * @param reportId - The report identifier.
   * @param options  - Optional request options.
   * @returns The compliance report with summary data.
   */
  async get(reportId, options) {
    return this.client.request(
      "GET",
      `/api/v1/compliance/reports/${encodeURIComponent(reportId)}`,
      void 0,
      options
    );
  }
  /**
   * List all compliance reports.
   *
   * @param options - Optional request options.
   * @returns Array of compliance reports.
   */
  async list(options) {
    return this.client.request("GET", "/api/v1/compliance/reports", void 0, options);
  }
  /**
   * Get quick compliance statistics for a rolling window.
   *
   * @param params  - Stats parameters (number of days).
   * @param options - Optional request options.
   * @returns Compliance summary statistics.
   */
  async quickStats(params, options) {
    const query = buildQuery(params);
    return this.client.request("GET", `/api/v1/compliance/stats${query}`, void 0, options);
  }
};

// src/client.ts
var ViennaClient = class {
  apiKey;
  baseUrl;
  timeout;
  retries;
  onError;
  /** Intent submission and status. */
  intent;
  /** Policy management. */
  policies;
  /** Fleet and agent management. */
  fleet;
  /** Approval workflows. */
  approvals;
  /** External integrations. */
  integrations;
  /** Compliance reporting. */
  compliance;
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("Vienna SDK: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retries = config.retries ?? DEFAULT_RETRIES;
    this.onError = config.onError;
    this.intent = new IntentModule(this);
    this.policies = new PoliciesModule(this);
    this.fleet = new FleetModule(this);
    this.approvals = new ApprovalsModule(this);
    this.integrations = new IntegrationsModule(this);
    this.compliance = new ComplianceModule(this);
  }
  /**
   * Make an authenticated request to the Vienna API.
   *
   * @param method  - HTTP method.
   * @param path    - API path (e.g. `/api/v1/intents`).
   * @param body    - Optional JSON request body.
   * @param options - Per-request options (signal, timeout override).
   * @returns Parsed response data.
   */
  async request(method, path, body, options) {
    const url = `${this.baseUrl}${path}`;
    const requestTimeout = options?.timeout ?? this.timeout;
    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
      if (options?.signal) {
        if (options.signal.aborted) {
          clearTimeout(timeoutId);
          controller.abort();
        } else {
          options.signal.addEventListener("abort", () => controller.abort(), { once: true });
        }
      }
      try {
        const headers = {
          "X-Vienna-Api-Key": this.apiKey,
          "X-Vienna-SDK-Version": SDK_VERSION,
          "Accept": "application/json"
        };
        if (body !== void 0) {
          headers["Content-Type"] = "application/json";
        }
        const response = await fetch(url, {
          method,
          headers,
          body: body !== void 0 ? JSON.stringify(body) : void 0,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (isRetryable(response.status) && attempt < this.retries) {
          const retryAfter = response.headers.get("retry-after");
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1e3 : backoffDelay(attempt);
          await sleep(delay);
          continue;
        }
        return await parseResponse(response);
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));
        const isAbort = lastError.name === "AbortError";
        const isRateLimit = lastError instanceof ViennaRateLimitError;
        if (isAbort || !isRateLimit && attempt >= this.retries) {
          this.onError?.(lastError);
          throw lastError;
        }
        if (attempt < this.retries) {
          await sleep(backoffDelay(attempt));
        }
      }
    }
    const finalError = lastError ?? new Error("Vienna SDK: request failed after retries");
    this.onError?.(finalError);
    throw finalError;
  }
};

// src/frameworks.ts
var BaseFrameworkAdapter = class {
  vienna;
  agentId;
  constructor(config, frameworkName) {
    this.vienna = new ViennaClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    });
    this.agentId = config.agentId || `${frameworkName}-${Date.now()}`;
  }
  async submitIntent(action, payload) {
    return await this.vienna.intent.submit({
      action,
      source: this.agentId,
      payload
    });
  }
  async waitForApproval(intentId, timeoutMs = 3e5) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.vienna.intent.status(intentId);
      if (status.status === "executed" || status.status === "denied" || status.status === "cancelled") {
        return status.status;
      }
      await new Promise((resolve) => setTimeout(resolve, 2e3));
    }
    throw new Error(`Approval timeout after ${timeoutMs}ms for intent ${intentId}`);
  }
  async reportExecution(intentId, result, details) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    console.log(`Execution report for intent ${intentId}: ${result}`, details);
    await this.vienna.compliance.generate({
      type: "custom",
      periodStart: today,
      periodEnd: today
    });
  }
  async register(metadata) {
    try {
      console.log(`Registering agent ${this.agentId} with metadata:`, metadata);
      await this.vienna.fleet.activate(this.agentId);
    } catch (error) {
      console.warn(`Failed to register agent ${this.agentId}:`, error);
    }
  }
};
var LangChainAdapter = class extends BaseFrameworkAdapter {
  constructor(config) {
    super(config, "langchain");
  }
  getFrameworkName() {
    return "langchain";
  }
  /** Enhanced submitIntent with LangChain tool context */
  async submitToolIntent(toolName, toolArgs, chainContext) {
    return await this.submitIntent(`tool_${toolName}`, {
      tool_name: toolName,
      tool_args: toolArgs,
      chain_context: chainContext
    });
  }
};
var CrewAIAdapter = class extends BaseFrameworkAdapter {
  constructor(config) {
    super(config, "crewai");
  }
  getFrameworkName() {
    return "crewai";
  }
  /** Enhanced submitIntent with CrewAI task context */
  async submitTaskIntent(taskType, taskPayload, crewContext) {
    return await this.submitIntent(`crew_${taskType}`, {
      task_type: taskType,
      task_payload: taskPayload,
      crew_context: crewContext
    });
  }
};
var AutoGenAdapter = class extends BaseFrameworkAdapter {
  constructor(config) {
    super(config, "autogen");
  }
  getFrameworkName() {
    return "autogen";
  }
  /** Enhanced submitIntent with AutoGen conversation context */
  async submitConversationIntent(functionName, functionArgs, conversationContext) {
    return await this.submitIntent(`function_${functionName}`, {
      function_name: functionName,
      function_args: functionArgs,
      conversation_context: conversationContext
    });
  }
};
var OpenClawAdapter = class extends BaseFrameworkAdapter {
  constructor(config) {
    super(config, "openclaw");
  }
  getFrameworkName() {
    return "openclaw";
  }
  /** Enhanced submitIntent with OpenClaw skill context */
  async submitSkillIntent(skillName, skillArgs, sessionContext) {
    return await this.submitIntent(`skill_${skillName}`, {
      skill_name: skillName,
      skill_args: skillArgs,
      session_context: sessionContext
    });
  }
};
function createForLangChain(config) {
  return new LangChainAdapter(config);
}
function createForCrewAI(config) {
  return new CrewAIAdapter(config);
}
function createForAutoGen(config) {
  return new AutoGenAdapter(config);
}
function createForOpenClaw(config) {
  return new OpenClawAdapter(config);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApprovalsModule,
  ComplianceModule,
  FleetModule,
  IntegrationsModule,
  IntentModule,
  PoliciesModule,
  ViennaAuthError,
  ViennaClient,
  ViennaError,
  ViennaForbiddenError,
  ViennaNotFoundError,
  ViennaRateLimitError,
  ViennaServerError,
  ViennaValidationError,
  createForAutoGen,
  createForCrewAI,
  createForLangChain,
  createForOpenClaw
});
//# sourceMappingURL=index.js.map