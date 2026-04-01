/**
 * Notification Center
 * 
 * In-app notification system for system events, approvals, and alerts
 */

import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api/client.js';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'approval';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
  action_label?: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  try {
    const response = await apiClient.get<{ data: Notification[] }>('/notifications?limit=50&read=false');
    return (response as any).data || [];
  } catch (error) {
    console.error('[NotificationCenter] Failed to fetch notifications:', error);
    return [];
  }
}

async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.patch(`/notifications/${notificationId}/read`, {});
}

async function markAllAsRead(): Promise<void> {
  await apiClient.post('/notifications/mark-all-read', {});
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('[NotificationCenter] Load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('[NotificationCenter] Mark as read failed:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('[NotificationCenter] Mark all as read failed:', error);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'approval':
        return <Check className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          borderRadius: '8px',
          border: 'none',
          background: isOpen ? 'var(--bg-secondary)' : 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => !isOpen && (e.currentTarget.style.background = 'var(--bg-secondary)')}
        onMouseLeave={(e) => !isOpen && (e.currentTarget.style.background = 'transparent')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            background: '#ef4444',
            borderRadius: '50%',
            border: '2px solid var(--bg-primary)',
          }} />
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <div style={{
            position: 'absolute',
            top: '56px',
            right: '16px',
            width: '400px',
            maxHeight: '600px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-secondary)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontFamily: 'inherit',
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '4px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '500px',
            }}>
              {loading ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: '13px',
                }}>
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                }}>
                  <Bell className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}>
                    No notifications
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                  }}>
                    You're all caught up!
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: notification.read ? 'default' : 'pointer',
                      background: notification.read ? 'transparent' : 'var(--bg-secondary)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                    }}>
                      <div style={{ flexShrink: 0, marginTop: '2px' }}>
                        {getIcon(notification.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}>
                          <h4 style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span style={{
                              width: '6px',
                              height: '6px',
                              background: '#7c3aed',
                              borderRadius: '50%',
                            }} />
                          )}
                        </div>
                        <p style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          marginBottom: '6px',
                          lineHeight: 1.4,
                        }}>
                          {notification.message}
                        </p>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <span style={{
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                          }}>
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          {notification.action_url && (
                            <a
                              href={notification.action_url}
                              style={{
                                fontSize: '11px',
                                color: 'var(--accent-primary)',
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {notification.action_label || 'View'} →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
