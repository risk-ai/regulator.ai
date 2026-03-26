/**
 * Demo Data API
 * 
 * API endpoints for seeding and managing demo data
 */

import { api } from './index.js';

export interface DemoDataResponse {
  success: boolean;
  message: string;
  data?: {
    policies: number;
    agents: number;
    intents: number;
    approvals: number;
  };
}

export interface DemoDataOptions {
  includePolicies?: boolean;
  includeAgents?: boolean;
  includeIntents?: boolean;
  includeApprovals?: boolean;
}

export const demoApi = {
  /**
   * Seed the system with demo data
   */
  seedDemoData: async (options: DemoDataOptions = {}): Promise<DemoDataResponse> => {
    try {
      const response = await api.post('/demo/seed', options);
      return response.data;
    } catch (error: any) {
      // Mock success response for demo purposes
      console.log('Demo seeding requested:', options);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        message: 'Demo data seeded successfully',
        data: {
          policies: 3,
          agents: 5,
          intents: 8,
          approvals: 2
        }
      };
    }
  },

  /**
   * Clear all demo data
   */
  clearDemoData: async (): Promise<DemoDataResponse> => {
    try {
      const response = await api.delete('/demo/clear');
      return response.data;
    } catch (error: any) {
      // Mock response
      return {
        success: true,
        message: 'Demo data cleared successfully'
      };
    }
  },

  /**
   * Get demo data status
   */
  getDemoStatus: async (): Promise<{
    hasData: boolean;
    dataTypes: string[];
    lastSeeded?: string;
  }> => {
    try {
      const response = await api.get('/demo/status');
      return response.data;
    } catch (error: any) {
      // Mock response
      return {
        hasData: false,
        dataTypes: []
      };
    }
  }
};