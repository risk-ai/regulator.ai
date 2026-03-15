/**
 * Vienna Runtime Client
 * 
 * Typed fetch wrapper for Vienna Runtime HTTP API
 */

const VIENNA_RUNTIME_URL = process.env.VIENNA_RUNTIME_URL || 'http://localhost:3001';

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
 * Fetch from Vienna Runtime with error handling
 */
async function viennaFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${VIENNA_RUNTIME_URL}${path}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

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
  
  create: async (data: any) => {
    return viennaFetch('/api/incidents', {
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

export default {
  investigations,
  incidents,
  artifacts,
  traces,
};
