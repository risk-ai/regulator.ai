/**
 * Policy Templates Page
 * Phase 31, Feature 1 - Frontend
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  priority: number;
  rules: any[];
  tags: string[];
  use_count: number;
}

export default function PolicyTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all'
        ? '/api/v1/policy-templates'
        : `/api/v1/policy-templates?category=${selectedCategory}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: PolicyTemplate) => {
    try {
      const response = await fetch(`/api/v1/policy-templates/${template.id}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          customizations: {}
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Navigate to policies page to see the new policy
        navigate('/policies');
      }
    } catch (error) {

    }
  };

  const categories = [
    { id: 'all', name: 'All Templates', icon: '📋' },
    { id: 'financial', name: 'Financial', icon: '💰' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'compliance', name: 'Compliance', icon: '📋' },
    { id: 'operations', name: 'Operations', icon: '⚙️' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Policy Templates</h1>
        <p className="text-[rgba(255,255,255,0.6)]">
          Choose from pre-built governance templates to get started quickly
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 flex space-x-2 border-b border-[rgba(255,255,255,0.08)]">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              selectedCategory === category.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-[rgba(255,255,255,0.6)] hover:text-[#e2e8f0]'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-[rgba(255,255,255,0.6)]">Loading templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-[rgba(255,255,255,0.6)] text-lg mb-2">No policy templates found</p>
              <p className="text-[rgba(255,255,255,0.4)] text-sm">
                {selectedCategory === 'all' ? 'Templates will appear here once they are created' : `No templates in the "${selectedCategory}" category`}
              </p>
            </div>
          ) : (
            templates.map((template) => (
            <div
              key={template.id}
              className="border border-[rgba(255,255,255,0.08)] rounded-lg p-6 hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{template.icon}</div>
                <span className="px-2 py-1 bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] text-xs rounded">
                  {template.category}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">
                {template.name}
              </h3>
              
              <p className="text-sm text-[rgba(255,255,255,0.6)] mb-4 line-clamp-3">
                {template.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-[rgba(255,255,255,0.4)]">
                  Used {template.use_count}x
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUseTemplate(template);
                }}
                className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              >
                Use Template
              </button>
            </div>
            ))
          )}
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="bg-[#12131a] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-[rgba(255,255,255,0.08)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-5xl mb-3">{selectedTemplate.icon}</div>
                <h2 className="text-2xl font-bold text-[#e2e8f0] mb-2">
                  {selectedTemplate.name}
                </h2>
                <p className="text-[rgba(255,255,255,0.6)]">{selectedTemplate.description}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)]"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-[#e2e8f0] mb-3">Policy Rules</h3>
              <div className="bg-[rgba(255,255,255,0.03)] rounded p-4">
                <pre className="text-sm text-[rgba(255,255,255,0.6)] whitespace-pre-wrap">
                  {JSON.stringify(selectedTemplate.rules, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-[#e2e8f0] mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[rgba(59,130,246,0.15)] text-blue-400 text-sm rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleUseTemplate(selectedTemplate)}
                className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Use This Template
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-6 py-3 border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors text-[rgba(255,255,255,0.6)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
