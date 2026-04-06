/**
 * Feedback Widget - Vienna OS
 * 
 * Floating bug report button with screenshot capture.
 * Sends feedback to Slack via API endpoint.
 */

import React, { useState } from 'react';
import { MessageSquare, X, Camera, Send } from 'lucide-react';

interface FeedbackData {
  message: string;
  page: string;
  userAgent: string;
  timestamp: string;
  screenshot?: string;
}

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const captureScreenshot = async () => {
    setCapturing(true);
    try {
      // Use html2canvas for screenshot (will need to install)
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
    } catch (err) {
      console.error('Screenshot capture failed:', err);
    } finally {
      setCapturing(false);
    }
  };

  const submitFeedback = async () => {
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      const feedback: FeedbackData = {
        message: message.trim(),
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        screenshot: screenshot || undefined,
      };

      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(feedback),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setMessage('');
        setScreenshot(null);
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('Feedback submission failed:', err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 9999,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(124, 58, 237, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.3)';
        }}
        title="Report Bug or Feedback"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '400px',
        maxWidth: 'calc(100vw - 48px)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10000,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Report Bug or Feedback
          </span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setMessage('');
            setScreenshot(null);
            setSubmitted(false);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      {submitted ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--success-text)',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            Feedback submitted!
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Thank you for helping us improve.
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: '20px' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the bug or share your feedback..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            />

            {/* Screenshot Preview */}
            {screenshot && (
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    loading="lazy"
                    style={{
                      width: '100%',
                      display: 'block',
                    }}
                  />
                  <button
                    onClick={() => setScreenshot(null)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div
              style={{
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <span>Page: {window.location.pathname}</span>
              <span>•</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={captureScreenshot}
              disabled={capturing || !!screenshot}
              style={{
                padding: '8px 12px',
                background: screenshot ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: screenshot ? 'var(--text-disabled)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: screenshot ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!screenshot && !capturing) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!screenshot && !capturing) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }
              }}
            >
              <Camera size={14} />
              {capturing ? 'Capturing...' : screenshot ? 'Screenshot Added' : 'Add Screenshot'}
            </button>

            <button
              onClick={submitFeedback}
              disabled={!message.trim() || submitting}
              style={{
                padding: '8px 16px',
                background: !message.trim() || submitting ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                border: 'none',
                borderRadius: '6px',
                color: !message.trim() || submitting ? 'var(--text-disabled)' : 'white',
                fontSize: '13px',
                fontWeight: 500,
                cursor: !message.trim() || submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => {
                if (message.trim() && !submitting) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Send size={14} />
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
