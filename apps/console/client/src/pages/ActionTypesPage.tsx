/**
 * Action Types Registry Page — Vienna OS
 * 
 * Custom Action Type management: view, create, edit, delete action types.
 * Grid layout with cards, filter bar, and registration modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useResponsive } from '../hooks/useResponsive.js';
import {
  actionTypesApi,
  type ActionType,
  type ActionTypeWithStats,
  type CreateActionTypePayload,
  type UpdateActionTypePayload,
  type CategoryInfo,
} from '../api/actionTypes.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_TIERS = [
  { value: 'T0', label: 'T0 — Auto-approve', color: '#10b981', description: 'Low risk. Executes automatically without human approval.' },
  { value: 'T1', label: 'T1 — Review Required', color: '#f59e0b', description: 'Medium risk. Requires operator review before execution.' },
  { value: 'T2', label: 'T2 — Multi-Party', color: '#ef4444', description: 'High risk. Requires multiple approvals before execution.' },
];

const ICON_OPTIONS = [
  'activity', 'alert-triangle', 'archive', 'arrow-right', 'bell', 'book',
  'briefcase', 'calendar', 'check-circle', 'cloud', 'code', 'cpu',
  'credit-card', 'database', 'dollar-sign', 'download', 'edit', 'external-link',
  'eye', 'file', 'file-text', 'flag', 'folder', 'git-branch',
  'globe', 'hard-drive', 'heart', 'home', 'image', 'inbox',
  'key', 'layers', 'layout', 'link', 'lock', 'mail',
  'map-pin', 'message-circle', 'monitor', 'package', 'percent', 'phone',
  'play', 'plus-circle', 'power', 'printer', 'refresh-cw', 'rocket',
  'save', 'search', 'send', 'server', 'settings', 'shield',
  'shopping-cart', 'shuffle', 'star', 'terminal', 'thumbs-up', 'tool',
  'trash', 'trending-up', 'truck', 'umbrella', 'unlock', 'upload',
  'upload-cloud', 'user', 'users', 'wifi', 'zap',
];

const COLOR_PRESETS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#f97316', '#64748b',
  '#eab308', '#14b8a6', '#a855f7', '#f43f5e', '#0ea5e9',
];

const CATEGORY_FILTERS = ['all', 'infrastructure', 'financial', 'healthcare', 'communication', 'integration', 'data', 'custom'];

const ICON_EMOJI_MAP: Record<string, string> = {
  'activity': '📊', 'alert-triangle': '⚠️', 'archive': '📦', 'arrow-right': '➡️',
  'bell': '🔔', 'book': '📖', 'briefcase': '💼', 'calendar': '📅',
  'check-circle': '✅', 'cloud': '☁️', 'code': '💻', 'cpu': '🖥️',
  'credit-card': '💳', 'database': '🗄️', 'dollar-sign': '💰', 'download': '⬇️',
  'edit': '✏️', 'external-link': '🔗', 'eye': '👁️', 'file': '📄',
  'file-text': '📝', 'flag': '🚩', 'folder': '📁', 'git-branch': '🔀',
  'globe': '🌐', 'hard-drive': '💾', 'heart': '❤️', 'home': '🏠',
  'image': '🖼️', 'inbox': '📥', 'key': '🔑', 'layers': '📚',
  'layout': '📐', 'link': '🔗', 'lock': '🔒', 'mail': '✉️',
  'map-pin': '📍', 'message-circle': '💬', 'monitor': '🖥️', 'package': '📦',
  'percent': '💹', 'phone': '📞', 'play': '▶️', 'plus-circle': '➕',
  'power': '⚡', 'printer': '🖨️', 'refresh-cw': '🔄', 'rocket': '🚀',
  'save': '💾', 'search': '🔍', 'send': '📤', 'server': '🖧',
  'settings': '⚙️', 'shield': '🛡️', 'shopping-cart': '🛒', 'shuffle': '🔀',
  'star': '⭐', 'terminal': '🖥️', 'thumbs-up': '👍', 'tool': '🔧',
  'trash': '🗑️', 'trending-up': '📈', 'truck': '🚚', 'umbrella': '☂️',
  'unlock': '🔓', 'upload': '⬆️', 'upload-cloud': '☁️', 'user': '👤',
  'users': '👥', 'wifi': '📶', 'zap': '⚡',
};

function getIconEmoji(icon: string): string {
  return ICON_EMOJI_MAP[icon] || '📊';
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  } as React.CSSProperties,
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  } as React.CSSProperties,
  registerBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  filterBtn: (active: boolean) => ({
    padding: '6px 14px',
    background: active ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255, 255, 255, 0.04)',
    color: active ? '#a78bfa' : '#9ca3af',
    border: active ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    textTransform: 'capitalize' as const,
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  card: {
    background: '#12131a',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    position: 'relative' as const,
  } as React.CSSProperties,
  cardHover: {
    borderColor: 'rgba(124, 58, 237, 0.3)',
    background: '#1a1b26',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  } as React.CSSProperties,
  cardIcon: (color: string) => ({
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: `${color}20`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  }),
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  } as React.CSSProperties,
  cardSlug: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  cardDescription: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '14px',
    lineHeight: '1.4',
    minHeight: '36px',
  } as React.CSSProperties,
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  } as React.CSSProperties,
  badge: (bg: string, color: string) => ({
    padding: '2px 8px',
    background: bg,
    color: color,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  }),
  lockIcon: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    fontSize: '14px',
    color: 'var(--text-muted)',
    title: 'Built-in (cannot be deleted)',
  } as React.CSSProperties,
  usageCount: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  // Modal styles
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  } as React.CSSProperties,
  modal: {
    background: '#0a0a0f',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '28px',
  } as React.CSSProperties,
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '18px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#d1d5db',
    marginBottom: '6px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#12131a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: '#12131a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
    fontFamily: 'monospace',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '10px 12px',
    background: '#12131a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: '12px',
  } as React.CSSProperties,
  halfCol: {
    flex: 1,
  } as React.CSSProperties,
  riskSelector: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  riskOption: (selected: boolean, color: string) => ({
    flex: 1,
    padding: '10px',
    background: selected ? `${color}15` : '#1f2937',
    border: selected ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center' as const,
  }),
  riskLabel: (color: string) => ({
    fontSize: '14px',
    fontWeight: 700,
    color: color,
  }),
  riskDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  } as React.CSSProperties,
  iconGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    maxHeight: '120px',
    overflow: 'auto',
    padding: '8px',
    background: '#12131a',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  } as React.CSSProperties,
  iconBtn: (selected: boolean) => ({
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    border: selected ? '2px solid #7c3aed' : '1px solid transparent',
    background: selected ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
  }),
  colorGrid: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  colorBtn: (color: string, selected: boolean) => ({
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: color,
    border: selected ? '2px solid #fff' : '2px solid transparent',
    cursor: 'pointer',
    outline: selected ? `2px solid ${color}` : 'none',
    outlineOffset: '2px',
  }),
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
    paddingTop: '18px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  } as React.CSSProperties,
  cancelBtn: {
    padding: '10px 20px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  } as React.CSSProperties,
  submitBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  deleteBtn: {
    padding: '10px 20px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginRight: 'auto',
  } as React.CSSProperties,
  toggleSwitch: (enabled: boolean) => ({
    width: '40px',
    height: '22px',
    borderRadius: '11px',
    background: enabled ? '#7c3aed' : '#4b5563',
    position: 'relative' as const,
    cursor: 'pointer',
    border: 'none',
    transition: 'background 150ms',
    flexShrink: 0,
  }),
  toggleKnob: (enabled: boolean) => ({
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute' as const,
    top: '2px',
    left: enabled ? '20px' : '2px',
    transition: 'left 150ms',
  }),
  error: {
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    color: '#fca5a5',
    fontSize: '13px',
    marginBottom: '16px',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  // Detail panel
  detailPanel: {
    background: '#0a0a0f',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
  } as React.CSSProperties,
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  } as React.CSSProperties,
  detailSection: {
    marginBottom: '16px',
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
  } as React.CSSProperties,
  schemaBlock: {
    background: '#12131a',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '6px',
    padding: '12px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#d1d5db',
    whiteSpace: 'pre-wrap' as const,
    overflow: 'auto',
    maxHeight: '200px',
  } as React.CSSProperties,
  usageBar: {
    display: 'flex',
    gap: '4px',
    alignItems: 'flex-end',
    height: '40px',
  } as React.CSSProperties,
  usageBarItem: (height: number, color: string) => ({
    width: '24px',
    height: `${Math.max(height, 2)}px`,
    background: color,
    borderRadius: '2px 2px 0 0',
    opacity: height > 0 ? 1 : 0.2,
  }),
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ActionTypesPage() {
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const { isMobile } = useResponsive();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ActionType | null>(null);

  // Detail panel
  const [selectedType, setSelectedType] = useState<ActionTypeWithStats | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [typesData, catsData] = await Promise.all([
        actionTypesApi.list({ category: filter === 'all' ? undefined : filter }),
        actionTypesApi.categories(),
      ]);
      setActionTypes(typesData || []);
      setCategories(catsData || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load action types');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Detail ────────────────────────────────────────────────────────────

  const handleCardClick = async (at: ActionType) => {
    if (selectedType?.id === at.id) {
      setSelectedType(null);
      return;
    }
    try {
      setLoadingDetail(true);
      const detail = await actionTypesApi.get(at.id);
      setSelectedType(detail);
    } catch {
      // Fallback: show basic info
      setSelectedType({ ...at, usage_count: at.usage_count || 0, usage_last_7_days: [] } as ActionTypeWithStats);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Toggle ────────────────────────────────────────────────────────────

  const handleToggle = async (at: ActionType, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await actionTypesApi.update(at.id, { enabled: !at.enabled });
      await fetchData();
      if (selectedType?.id === at.id) {
        const detail = await actionTypesApi.get(at.id);
        setSelectedType(detail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this action type? This cannot be undone.')) return;
    try {
      await actionTypesApi.delete(id);
      setSelectedType(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  const riskColor = (tier: string) => {
    switch (tier) {
      case 'T0': return '#10b981';
      case 'T1': return '#f59e0b';
      case 'T2': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const riskBg = (tier: string) => {
    switch (tier) {
      case 'T0': return 'rgba(16, 185, 129, 0.15)';
      case 'T1': return 'rgba(245, 158, 11, 0.15)';
      case 'T2': return 'rgba(239, 68, 68, 0.15)';
      default: return 'rgba(107, 114, 128, 0.15)';
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>⚡ Action Type Registry</h1>
          <p style={styles.subtitle}>
            {actionTypes.length} action type{actionTypes.length !== 1 ? 's' : ''} registered
            {categories.length > 0 && ` across ${categories.length} categories`}
          </p>
        </div>
        <button
          style={styles.registerBtn}
          onClick={() => { setEditingType(null); setShowModal(true); }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          ➕ Register New Action Type
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#fca5a5', marginLeft: '12px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            dismiss
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div style={styles.filterBar}>
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat}
            style={styles.filterBtn(filter === cat)}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selectedType && (
        <DetailPanel
          type={selectedType}
          loading={loadingDetail}
          onEdit={() => { setEditingType(selectedType); setShowModal(true); }}
          onDelete={() => handleDelete(selectedType.id)}
          onClose={() => setSelectedType(null)}
          riskColor={riskColor}
          riskBg={riskBg}
        />
      )}

      {/* Grid */}
      {loading ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '16px' }}>Loading action types...</p>
        </div>
      ) : actionTypes.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>⚡</p>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>No action types found</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Register your first custom action type to get started</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {actionTypes.map(at => {
            const isHovered = hoveredCard === at.id;
            const isSelected = selectedType?.id === at.id;
            return (
              <div
                key={at.id}
                style={{
                  ...styles.card,
                  ...(isHovered || isSelected ? styles.cardHover : {}),
                  ...(isSelected ? { borderColor: 'rgba(124, 58, 237, 0.5)' } : {}),
                  opacity: at.enabled ? 1 : 0.5,
                }}
                onMouseEnter={() => setHoveredCard(at.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleCardClick(at)}
              >
                {at.is_builtin && <span style={styles.lockIcon} title="Built-in (protected)">🔒</span>}

                <div style={styles.cardHeader}>
                  <div style={styles.cardIcon(at.color)}>
                    {getIconEmoji(at.icon)}
                  </div>
                  <div>
                    <h3 style={styles.cardTitle}>{at.display_name}</h3>
                    <span style={styles.cardSlug}>{at.action_type}</span>
                  </div>
                </div>

                <p style={styles.cardDescription}>
                  {at.description || 'No description'}
                </p>

                <div style={styles.cardFooter}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={styles.badge(`${at.color}20`, at.color)}>
                      {at.category}
                    </span>
                    <span style={styles.badge(riskBg(at.default_risk_tier), riskColor(at.default_risk_tier))}>
                      {at.default_risk_tier}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={styles.usageCount}>
                      {at.usage_count || 0} uses
                    </span>
                    <button
                      style={styles.toggleSwitch(at.enabled)}
                      onClick={(e) => handleToggle(at, e)}
                      title={at.enabled ? 'Disable' : 'Enable'}
                    >
                      <div style={styles.toggleKnob(at.enabled)} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration / Edit Modal */}
      {showModal && (
        <RegistrationModal
          editingType={editingType}
          onClose={() => { setShowModal(false); setEditingType(null); }}
          onSaved={() => { setShowModal(false); setEditingType(null); fetchData(); setSelectedType(null); }}
          onError={setError}
        />
      )}
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

interface DetailPanelProps {
  type: ActionTypeWithStats;
  loading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  riskColor: (tier: string) => string;
  riskBg: (tier: string) => string;
}

function DetailPanel({ type, loading, onEdit, onDelete, onClose, riskColor, riskBg }: DetailPanelProps) {
  const { isMobile } = useResponsive();
  
  if (loading) {
    return (
      <div style={styles.detailPanel}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading details...</p>
      </div>
    );
  }

  const maxUsage = Math.max(...(type.usage_last_7_days?.map(d => d.count) || [0]), 1);

  return (
    <div style={styles.detailPanel}>
      <div style={styles.detailHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.cardIcon(type.color)}>
            <span style={{ fontSize: '24px' }}>{getIconEmoji(type.icon)}</span>
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>{type.display_name}</h2>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-muted)' }}>{type.action_type}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{ ...styles.cancelBtn, fontSize: '12px', padding: '6px 12px' }}
            onClick={onEdit}
          >
            ✏️ Edit
          </button>
          {!type.is_builtin && (
            <button
              style={{ ...styles.deleteBtn, fontSize: '12px', padding: '6px 12px', marginRight: 0 }}
              onClick={onDelete}
            >
              🗑️ Delete
            </button>
          )}
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
        <div>
          <div style={styles.detailSection}>
            <div style={styles.sectionLabel}>Description</div>
            <p style={{ margin: 0, color: '#d1d5db', fontSize: '13px' }}>{type.description || 'No description'}</p>
          </div>

          <div style={styles.detailSection}>
            <div style={styles.sectionLabel}>Properties</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={styles.badge(`${type.color}20`, type.color)}>{type.category}</span>
              <span style={styles.badge(riskBg(type.default_risk_tier), riskColor(type.default_risk_tier))}>
                {type.default_risk_tier}
              </span>
              {type.is_builtin && <span style={styles.badge('rgba(107,114,128,0.15)', '#9ca3af')}>🔒 built-in</span>}
              <span style={styles.badge(type.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', type.enabled ? '#10b981' : '#ef4444')}>
                {type.enabled ? 'enabled' : 'disabled'}
              </span>
            </div>
          </div>

          <div style={styles.detailSection}>
            <div style={styles.sectionLabel}>Payload Schema</div>
            <div style={styles.schemaBlock}>
              {Object.keys(type.payload_schema || {}).length > 0
                ? JSON.stringify(type.payload_schema, null, 2)
                : '(no schema defined — accepts any payload)'}
            </div>
          </div>
        </div>

        <div>
          <div style={styles.detailSection}>
            <div style={styles.sectionLabel}>Usage — Last 7 Days ({type.usage_count} total)</div>
            {type.usage_last_7_days && type.usage_last_7_days.length > 0 ? (
              <div style={styles.usageBar}>
                {type.usage_last_7_days.map((d, i) => (
                  <div
                    key={i}
                    style={styles.usageBarItem((d.count / maxUsage) * 40, type.color)}
                    title={`${d.day}: ${d.count} uses`}
                  />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>No usage recorded</p>
            )}
          </div>

          <div style={styles.detailSection}>
            <div style={styles.sectionLabel}>Metadata</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
              <div>Created by: <span style={{ color: 'var(--text-secondary)' }}>{type.created_by}</span></div>
              <div>Created: <span style={{ color: 'var(--text-secondary)' }}>{new Date(type.created_at).toLocaleString()}</span></div>
              <div>Updated: <span style={{ color: 'var(--text-secondary)' }}>{new Date(type.updated_at).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Registration Modal ──────────────────────────────────────────────────────

interface RegistrationModalProps {
  editingType: ActionType | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

function RegistrationModal({ editingType, onClose, onSaved, onError }: RegistrationModalProps) {
  const isEdit = !!editingType;

  const [displayName, setDisplayName] = useState(editingType?.display_name || '');
  const [actionTypeSlug, setActionTypeSlug] = useState(editingType?.action_type || '');
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [description, setDescription] = useState(editingType?.description || '');
  const [category, setCategory] = useState(editingType?.category || 'custom');
  const [riskTier, setRiskTier] = useState(editingType?.default_risk_tier || 'T1');
  const [payloadSchema, setPayloadSchema] = useState(
    editingType?.payload_schema && Object.keys(editingType.payload_schema).length > 0
      ? JSON.stringify(editingType.payload_schema, null, 2)
      : ''
  );
  const [icon, setIcon] = useState(editingType?.icon || 'activity');
  const [color, setColor] = useState(editingType?.color || '#3b82f6');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Auto-generate slug from display name
  useEffect(() => {
    if (!slugEdited && !isEdit) {
      const slug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      setActionTypeSlug(slug);
    }
  }, [displayName, slugEdited, isEdit]);

  const handleSave = async () => {
    setFormError(null);

    if (!displayName.trim()) {
      setFormError('Display name is required');
      return;
    }

    if (!actionTypeSlug.trim()) {
      setFormError('Action type identifier is required');
      return;
    }

    // Parse payload schema if provided
    let parsedSchema: Record<string, unknown> = {};
    if (payloadSchema.trim()) {
      try {
        parsedSchema = JSON.parse(payloadSchema);
      } catch {
        setFormError('Invalid JSON in payload schema');
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit && editingType) {
        const updatePayload: UpdateActionTypePayload = {};
        if (!editingType.is_builtin) {
          updatePayload.display_name = displayName;
          updatePayload.description = description;
          updatePayload.category = category;
          updatePayload.payload_schema = parsedSchema;
          updatePayload.default_risk_tier = riskTier;
          updatePayload.icon = icon;
          updatePayload.color = color;
        }
        await actionTypesApi.update(editingType.id, updatePayload);
      } else {
        const createPayload: CreateActionTypePayload = {
          action_type: actionTypeSlug,
          display_name: displayName,
          description: description || undefined,
          category,
          payload_schema: parsedSchema,
          default_risk_tier: riskTier,
          icon,
          color,
        };
        await actionTypesApi.create(createPayload);
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save';
      setFormError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalTitle}>
          <span>{isEdit ? '✏️ Edit Action Type' : '➕ Register New Action Type'}</span>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {formError && <div style={styles.error}>{formError}</div>}

        {isEdit && editingType?.is_builtin && (
          <div style={{ ...styles.error, background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' }}>
            🔒 This is a built-in action type. Only the enabled toggle can be changed.
          </div>
        )}

        {/* Display Name */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Display Name</label>
          <input
            style={styles.input}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="e.g., Wire Transfer"
            disabled={isEdit && editingType?.is_builtin}
          />
        </div>

        {/* Action Type Slug */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Action Type Identifier
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
              (auto-generated, editable)
            </span>
          </label>
          <input
            style={{ ...styles.input, fontFamily: 'monospace' }}
            value={actionTypeSlug}
            onChange={e => { setActionTypeSlug(e.target.value); setSlugEdited(true); }}
            placeholder="e.g., wire_transfer"
            disabled={isEdit}
          />
        </div>

        {/* Description */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <textarea
            style={{ ...styles.textarea, fontFamily: 'inherit' }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this action do?"
            disabled={isEdit && editingType?.is_builtin}
          />
        </div>

        {/* Category + Risk Tier row */}
        <div style={styles.row}>
          <div style={styles.halfCol}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select
                style={styles.select}
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isEdit && editingType?.is_builtin}
              >
                <option value="infrastructure">Infrastructure</option>
                <option value="financial">Financial</option>
                <option value="healthcare">Healthcare</option>
                <option value="communication">Communication</option>
                <option value="integration">Integration</option>
                <option value="data">Data</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div style={styles.halfCol}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Default Risk Tier</label>
              <div style={styles.riskSelector}>
                {RISK_TIERS.map(tier => (
                  <div
                    key={tier.value}
                    style={styles.riskOption(riskTier === tier.value, tier.color)}
                    onClick={() => {
                      if (!(isEdit && editingType?.is_builtin)) setRiskTier(tier.value);
                    }}
                  >
                    <div style={styles.riskLabel(tier.color)}>{tier.value}</div>
                    <div style={styles.riskDesc}>{tier.value === 'T0' ? 'Auto' : tier.value === 'T1' ? 'Review' : 'Multi'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payload Schema */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Payload Schema (JSON)
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
              optional — validates incoming payloads
            </span>
          </label>
          <textarea
            style={styles.textarea}
            value={payloadSchema}
            onChange={e => setPayloadSchema(e.target.value)}
            placeholder={`{\n  "type": "object",\n  "required": ["target"],\n  "properties": {\n    "target": { "type": "string" }\n  }\n}`}
            rows={6}
            disabled={isEdit && editingType?.is_builtin}
          />
        </div>

        {/* Icon + Color row */}
        <div style={styles.row}>
          <div style={styles.halfCol}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Icon
                <button
                  style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', marginLeft: '8px', fontSize: '12px' }}
                  onClick={() => setShowIconPicker(!showIconPicker)}
                >
                  {showIconPicker ? 'hide picker' : 'show picker'}
                </button>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ ...styles.cardIcon(color), width: '36px', height: '36px' }}>
                  {getIconEmoji(icon)}
                </div>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  disabled={isEdit && editingType?.is_builtin}
                />
              </div>
              {showIconPicker && (
                <div style={{ ...styles.iconGrid, marginTop: '8px' }}>
                  {ICON_OPTIONS.map(ic => (
                    <button
                      key={ic}
                      style={styles.iconBtn(icon === ic)}
                      onClick={() => { if (!(isEdit && editingType?.is_builtin)) setIcon(ic); }}
                      title={ic}
                    >
                      {getIconEmoji(ic)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={styles.halfCol}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <div style={styles.colorGrid}>
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    style={styles.colorBtn(c, color === c)}
                    onClick={() => { if (!(isEdit && editingType?.is_builtin)) setColor(c); }}
                  />
                ))}
              </div>
              <input
                style={{ ...styles.input, marginTop: '8px', width: '120px' }}
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#3b82f6"
                disabled={isEdit && editingType?.is_builtin}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...styles.submitBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Action Type'}
          </button>
        </div>
      </div>
    </div>
  );
}
