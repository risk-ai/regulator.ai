/**
 * Vienna Runtime Client
 * 
 * Typed fetch wrapper for Vienna Runtime HTTP API
 */

const VIENNA_RUNTIME_URL = process.env.VIENNA_RUNTIME_URL || 'http://localhost:3001';

// Import shared types from Vienna Runtime
export interface Investigation {
  id: string;
  name: string;
  description?: string;
  status: 'open' | 'investigating' | 'resolved' | 'archived';
  objective_id?: string;
  created_by: string;
  created_at: string;
  resolved_at?: string;
  workspace_path: string;
  artifact_count?: number;
  trace_count?: number;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  service_id: string;
  detected_by: string;
  detected_at: string;
  resolved_at?: string;
  resolution_summary?: string;
}

export interface CreateIncidentRequest {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status?: 'open' | 'investigating' | 'resolved';
  service_id: string;
  detected_by: string;
  detected_at?: string;
  resolution_summary?: string;
}

export interface ViennaErrorResponse {
  error: string;
  message: string;
}

export class ViennaRuntimeError extends Error {
  constructor(
    public status: number,
    public error: string,
    message: string
  ) {
    super(message);
    this.name = 'ViennaRuntimeError';
  }
}

/**
 * Fetch from Vienna Runtime with error handling and timeout
 */
async function viennaFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${VIENNA_RUNTIME_URL}${path}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json() as ViennaErrorResponse;
      throw new ViennaRuntimeError(
        response.status,
        errorData.error,
        errorData.message
      );
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ViennaRuntimeError) {
      throw error;
    }
    
    // Network errors or timeout
    if (error instanceof TypeError || (error as Error).name === 'AbortError') {
      throw new ViennaRuntimeError(
        503,
        'runtime_unavailable',
        'Vienna Runtime is currently unavailable. The runtime service may be offline or unreachable.'
      );
    }
    
    throw new Error(`Vienna Runtime request failed: ${error}`);
  }
}

/**
 * Investigations API
 */
export const investigations = {
  list: async (params?: { status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return viennaFetch(`/api/investigations${query ? `?${query}` : ''}`);
  },
  
  get: async (id: string) => {
    return viennaFetch(`/api/investigations/${id}`);
  },
};

/**
 * Incidents API
 */
export const incidents = {
  list: async () => {
    return viennaFetch('/api/incidents');
  },
  
  get: async (id: string) => {
    return viennaFetch(`/api/incidents/${id}`);
  },
  
  create: async (data: CreateIncidentRequest) => {
    return viennaFetch<Incident>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Artifacts API
 */
export const artifacts = {
  list: async () => {
    return viennaFetch('/api/artifacts');
  },
  
  get: async (id: string) => {
    return viennaFetch(`/api/artifacts/${id}`);
  },
};

/**
 * Traces API
 */
export const traces = {
  get: async (id: string) => {
    return viennaFetch(`/api/traces/${id}`);
  },
  
  getTimeline: async (id: string) => {
    return viennaFetch(`/api/traces/${id}/timeline`);
  },
};

const viennaClient = {
  investigations,
  incidents,
  artifacts,
  traces,
};

export default viennaClient;
