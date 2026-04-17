import { useState, useEffect } from 'react';
import { Code, Copy, Check, Eye, ExternalLink } from 'lucide-react';

interface WidgetConfig {
  theme: 'light' | 'dark' | 'terminal';
  showAgents: boolean;
  showWarrants: boolean;
  showApprovals: boolean;
  showPolicies: boolean;
  refreshInterval: number;
  size: 'small' | 'medium' | 'large';
}

export default function EmbedWidgetPage() {
  const [config, setConfig] = useState<WidgetConfig>({
    theme: 'terminal',
    showAgents: true,
    showWarrants: true,
    showApprovals: true,
    showPolicies: true,
    refreshInterval: 60,
    size: 'medium',
  });
  const [copied, setCopied] = useState(false);

  const generateEmbedCode = () => {
    const params = new URLSearchParams({
      theme: config.theme,
      metrics: [
        config.showAgents && 'agents',
        config.showWarrants && 'warrants',
        config.showApprovals && 'approvals',
        config.showPolicies && 'policies',
      ]
        .filter(Boolean)
        .join(','),
      refresh: config.refreshInterval.toString(),
      size: config.size,
    });

    return `<iframe
  src="https://console.regulator.ai/embed/stats?${params}"
  width="${config.size === 'small' ? '300' : config.size === 'medium' ? '400' : '600'}"
  height="${config.size === 'small' ? '200' : config.size === 'medium' ? '300' : '400'}"
  frameborder="0"
  style="border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 8px; background: #0a0a0a;"
></iframe>`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#e4e4e4] overflow-hidden">

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Code className="w-8 h-8 text-[#d4af37]" />
          <div>
            <h1 className="text-3xl font-bold text-[#d4af37] font-mono">Embeddable Widget Generator</h1>
            <p className="text-sm text-gray-400 mt-1">
              Generate embeddable governance stats for your website, docs, or blog
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-6">
              <h2 className="text-lg font-bold text-[#d4af37] font-mono mb-6 uppercase tracking-wider">
                Widget Configuration
              </h2>

              {/* Theme */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-gray-400 uppercase mb-2">Theme</label>
                <div className="flex gap-3">
                  {(['light', 'dark', 'terminal'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setConfig({ ...config, theme })}
                      className={`flex-1 py-2 px-4 rounded border font-mono text-xs uppercase transition-all ${
                        config.theme === theme
                          ? 'bg-[#d4af37] text-black border-[#d4af37]'
                          : 'bg-[#0a0a0a]/60 text-gray-400 border-gray-800 hover:border-[#d4af37]/40'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-gray-400 uppercase mb-2">Size</label>
                <div className="flex gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setConfig({ ...config, size })}
                      className={`flex-1 py-2 px-4 rounded border font-mono text-xs uppercase transition-all ${
                        config.size === size
                          ? 'bg-[#d4af37] text-black border-[#d4af37]'
                          : 'bg-[#0a0a0a]/60 text-gray-400 border-gray-800 hover:border-[#d4af37]/40'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs font-mono text-gray-500">
                  {config.size === 'small' && '300×200px'}
                  {config.size === 'medium' && '400×300px'}
                  {config.size === 'large' && '600×400px'}
                </div>
              </div>

              {/* Metrics */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-gray-400 uppercase mb-2">Visible Metrics</label>
                <div className="space-y-2">
                  {[
                    { key: 'showAgents', label: 'Active Agents' },
                    { key: 'showWarrants', label: 'Warrants Issued' },
                    { key: 'showApprovals', label: 'Pending Approvals' },
                    { key: 'showPolicies', label: 'Active Policies' },
                  ].map((metric) => (
                    <label key={metric.key} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={config[metric.key as keyof WidgetConfig] as boolean}
                        onChange={(e) => setConfig({ ...config, [metric.key]: e.target.checked })}
                        className="w-4 h-4 accent-[#d4af37]"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-[#d4af37] transition-colors">
                        {metric.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Refresh Interval */}
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-2">
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={config.refreshInterval}
                  onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 60 })}
                  className="w-full px-4 py-2 bg-[#0a0a0a]/60 border border-gray-800 rounded text-gray-300 font-mono text-sm focus:outline-none focus:border-[#d4af37]/60"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#d4af37] font-mono uppercase tracking-wider">Live Preview</h2>
                <Eye className="w-5 h-5 text-[#d4af37]/60" />
              </div>
              <div
                className={`rounded border overflow-hidden ${
                  config.theme === 'terminal'
                    ? 'bg-[#0a0a0a] border-[#d4af37]/20'
                    : config.theme === 'dark'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-300'
                }`}
                style={{
                  width: config.size === 'small' ? '300px' : config.size === 'medium' ? '400px' : '100%',
                  height: config.size === 'small' ? '200px' : config.size === 'medium' ? '300px' : '400px',
                }}
              >
                <MockWidget config={config} />
              </div>
            </div>
          </div>

          {/* Embed Code Panel */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#d4af37] font-mono uppercase tracking-wider">Embed Code</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#d4af37]/20 text-[#d4af37] rounded border border-[#d4af37]/40 hover:bg-[#d4af37]/30 transition-colors text-xs font-mono"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-[#0a0a0a]/80 border border-gray-800 rounded p-4 overflow-x-auto text-xs text-gray-300 font-mono">
                {generateEmbedCode()}
              </pre>
            </div>

            {/* Usage Instructions */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-6">
              <h2 className="text-lg font-bold text-[#d4af37] font-mono mb-4 uppercase tracking-wider">
                Usage Instructions
              </h2>

              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h3 className="font-bold text-[#d4af37] mb-2 font-mono text-xs uppercase">1. Copy the code</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Click the "Copy" button above to copy the embed code to your clipboard.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-[#d4af37] mb-2 font-mono text-xs uppercase">2. Paste into HTML</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Add the iframe code to your website, documentation, or blog post where you want the stats widget to
                    appear.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-[#d4af37] mb-2 font-mono text-xs uppercase">3. Customize</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Adjust the configuration options on the left to match your site's design and data requirements.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <h3 className="font-bold text-[#d4af37] mb-2 font-mono text-xs uppercase">Example Use Cases</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4af37] mt-1">•</span>
                      <span>Add to your homepage to showcase live governance metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4af37] mt-1">•</span>
                      <span>Embed in documentation for transparency</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4af37] mt-1">•</span>
                      <span>Include in blog posts about your AI governance practices</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4af37] mt-1">•</span>
                      <span>Share with stakeholders in compliance reports</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <a
                    href="https://docs.regulator.ai/embed-widget"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#d4af37] hover:text-[#d4af37]/80 transition-colors font-mono text-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View full documentation
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock widget for preview
function MockWidget({ config }: { config: WidgetConfig }) {
  const [metrics, setMetrics] = useState({
    agents: 24,
    warrants: 1847,
    approvals: 3,
    policies: 15,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        agents: 24,
        warrants: metrics.warrants + 1,
        approvals: metrics.approvals > 0 ? metrics.approvals - 1 : 3,
        policies: 15,
      });
    }, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [config.refreshInterval]);

  const textColor =
    config.theme === 'terminal' ? '#d4af37' : config.theme === 'dark' ? '#10b981' : '#059669';
  const bgColor = config.theme === 'terminal' ? '#0a0a0a' : config.theme === 'dark' ? '#111827' : '#ffffff';
  const secondaryText = config.theme === 'light' ? '#6b7280' : '#9ca3af';

  return (
    <div className="p-6 h-full flex flex-col" style={{ background: bgColor }}>
      <h3
        className="text-lg font-bold font-mono mb-4"
        style={{ color: textColor }}
      >
        Vienna OS Stats
      </h3>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {config.showAgents && (
          <div>
            <div className="text-xs font-mono uppercase mb-1" style={{ color: secondaryText }}>
              Active Agents
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color: textColor }}>
              {metrics.agents}
            </div>
          </div>
        )}
        {config.showWarrants && (
          <div>
            <div className="text-xs font-mono uppercase mb-1" style={{ color: secondaryText }}>
              Warrants
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color: textColor }}>
              {metrics.warrants}
            </div>
          </div>
        )}
        {config.showApprovals && (
          <div>
            <div className="text-xs font-mono uppercase mb-1" style={{ color: secondaryText }}>
              Pending
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color: textColor }}>
              {metrics.approvals}
            </div>
          </div>
        )}
        {config.showPolicies && (
          <div>
            <div className="text-xs font-mono uppercase mb-1" style={{ color: secondaryText }}>
              Policies
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color: textColor }}>
              {metrics.policies}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs font-mono mt-4 pt-4 border-t" style={{ color: secondaryText, borderColor: secondaryText + '40' }}>
        Powered by Vienna OS
      </div>
    </div>
  );
}
