/**
 * Activity Feed Page
 * Phase 31, Feature 2 - Frontend
 */

import React, { useState, useEffect } from 'react';

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: string;
  agent: {
    id: string;
    display_name: string;
  };
  execution: {
    id: string;
    status: string;
    objective: string;
  };
}

interface ActivitySummary {
  period: string;
  total_actions: number;
  actions_by_status: Record<string, number>;
  top_agents: Array<{ agent_id: string; count: number }>;
}

export default function ActivityFeedPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [period, setPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
    fetchSummary();
    
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchFeed();
      fetchSummary();
    }, 5000);

    return () => clearInterval(interval);
  }, [period]);

  const fetchFeed = async () => {
    try {
      const response = await fetch(`/api/v1/activity/feed?limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/v1/activity/summary?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Feed</h1>
        <p className="text-gray-600">Real-time view of all agent activity in your organization</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Actions</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_actions}</div>
            <div className="text-xs text-gray-500 mt-1">Last {period}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">
              {summary.actions_by_status.completed || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.total_actions > 0
                ? Math.round((summary.actions_by_status.completed || 0) / summary.total_actions * 100)
                : 0}% success rate
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-600">
              {summary.actions_by_status.failed || 0}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.actions_by_status.pending_approval || 0}
            </div>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="mb-6 flex items-center space-x-2">
        <span className="text-sm text-gray-600">Time period:</span>
        {['1h', '24h', '7d', '30d'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded text-sm ${
              period === p
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading activity...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No recent activity
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {event.agent?.display_name || 'Unknown Agent'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(event.execution.status)}`}>
                        {event.execution.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-1">
                      {event.type}
                    </div>
                    
                    {event.execution.objective && (
                      <div className="text-sm text-gray-500">
                        Objective: {event.execution.objective}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      // Navigate to execution details
                      window.location.href = `/executions/${event.execution.id}`;
                    }}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Agents */}
      {summary && summary.top_agents.length > 0 && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Agents</h2>
          <div className="space-y-3">
            {summary.top_agents.slice(0, 5).map((agent, index) => (
              <div key={agent.agent_id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 font-medium">#{index + 1}</span>
                  <span className="text-gray-900">{agent.agent_id}</span>
                </div>
                <span className="text-gray-600">{agent.count} actions</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
