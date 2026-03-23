/**
 * Settings Page
 * Phase 2: Information Architecture
 * 
 * Operator preferences and system configuration
 */

import { PageLayout } from '../components/layout/PageLayout.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * Settings Page - Configuration and preferences
 * 
 * Answers:
 * - How do I configure providers?
 * - How do I change session settings?
 * - How do I export audit logs?
 * - How do I view system info?
 */
export function SettingsPage() {
  const { logout } = useAuthStore();
  
  return (
    <PageLayout
      title="Settings"
      description="Operator preferences and system configuration"
    >
      <div className="space-y-6">
        {/* Session Info Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Session Info
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Operator</span>
              <span className="text-white font-medium">vienna</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Session</span>
              <span className="text-white text-xs">Active</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Login Time</span>
              <span className="text-white">Current session</span>
            </div>
            
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Environment</span>
              <span className="text-white">Production</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* System Info Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            System Info
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Environment</span>
              <span className="text-white font-medium">Production</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Vienna OS Version</span>
              <span className="text-white font-mono">8.5.0</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Phase</span>
              <span className="text-white">
                Phase 10.3 (Execution Timeouts)
              </span>
            </div>
            
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Build Timestamp</span>
              <span className="text-white font-mono text-xs">2026-03-14</span>
            </div>
          </div>
        </div>
        
        {/* Provider Configuration Panel - Placeholder */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Provider Configuration
          </h2>
          
          <div className="text-center py-8 text-gray-400">
            <p>Provider configuration interface</p>
            <p className="text-sm mt-2">
              Anthropic API key, Ollama endpoint, model preferences
            </p>
            <p className="text-xs mt-4 text-gray-500">
              (Configuration UI to be implemented)
            </p>
          </div>
        </div>
        
        {/* About Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Documentation & Support
          </h2>
          
          <div className="space-y-2">
            <a
              href="https://docs.openclaw.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white transition"
            >
              📚 OpenClaw Documentation
            </a>
            
            <a
              href="https://github.com/openclaw/openclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white transition"
            >
              🔧 GitHub Repository
            </a>
            
            <a
              href="https://discord.com/invite/clawd"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white transition"
            >
              💬 Community Discord
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
