/**
 * Agent Templates Page
 * Phase 31, Feature 5 - Frontend
 */

import React, { useState, useEffect } from 'react';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  icon: string;
  config: any;
  policies: any[];
  integration_code: string;
  quick_start_guide: string;
  tags: string[];
  use_count: number;
}

export default function AgentTemplatesPage() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/agent-templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: AgentTemplate) => {
    try {
      await fetch(`/api/v1/agent-templates/${template.id}/use`, {
        method: 'POST'
      });
      
      // Show integration code
      setSelectedTemplate(template);
      setShowCode(true);
    } catch (error) {
      console.error('Failed to record template usage:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Templates</h1>
        <p className="text-gray-600">
          Framework-specific governance templates with ready-to-use integration code
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{template.icon}</div>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 text-sm rounded font-medium">
                  {template.framework}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {template.name}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {template.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 border border-blue-500 text-blue-500 py-2 px-4 rounded hover:bg-blue-50 transition-colors"
                >
                  Get Started
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500 text-center">
                Used by {template.use_count} teams
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && !showCode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="text-6xl">{selectedTemplate.icon}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedTemplate.name}
                  </h2>
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 text-sm rounded">
                    {selectedTemplate.framework}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="prose max-w-none mb-6">
              <div
                className="whitespace-pre-wrap text-gray-700"
                dangerouslySetInnerHTML={{ __html: selectedTemplate.quick_start_guide.replace(/\n/g, '<br/>') }}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  handleUseTemplate(selectedTemplate);
                }}
                className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Get Integration Code
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integration Code Modal */}
      {showCode && selectedTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowCode(false);
            setSelectedTemplate(null);
          }}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedTemplate.name} - Integration Code
              </h2>
              <button
                onClick={() => {
                  setShowCode(false);
                  setSelectedTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Sample Code</h3>
                <button
                  onClick={() => copyToClipboard(selectedTemplate.integration_code)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                >
                  Copy Code
                </button>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {selectedTemplate.integration_code}
                </pre>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Recommended Policies</h3>
              <div className="bg-gray-50 rounded p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(selectedTemplate.policies, null, 2)}
                </pre>
              </div>
            </div>

            <button
              onClick={() => {
                setShowCode(false);
                setSelectedTemplate(null);
              }}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
