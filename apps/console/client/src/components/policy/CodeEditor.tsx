/**
 * Code Editor for Policy Rules
 * 
 * Terminal-style editor with line numbers and syntax highlighting.
 * Keywords: allow, deny, require, when (amber)
 * Strings: green
 * Comments: dim
 */

import React, { useRef, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  placeholder = '{}',
  minHeight = '120px',
  disabled = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync line numbers with textarea scroll
  useEffect(() => {
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (!textarea || !lineNumbers) return;

    const handleScroll = () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    };

    textarea.addEventListener('scroll', handleScroll);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, []);

  // Update line numbers when content changes
  const lines = value.split('\n');
  const lineCount = lines.length;

  return (
    <div
      className="relative rounded overflow-hidden font-mono"
      style={{
        background: '#0a0a0f',
        border: '1px solid rgba(212, 168, 83, 0.3)',
      }}
    >
      <div className="flex">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="shrink-0 select-none overflow-hidden"
          style={{
            width: '48px',
            padding: '12px 8px',
            textAlign: 'right',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRight: '1px solid rgba(212, 168, 83, 0.2)',
            color: 'rgba(212, 168, 83, 0.5)',
            fontSize: '13px',
            lineHeight: '1.5',
            userSelect: 'none',
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        {/* Editor */}
        <div className="relative flex-1">
          {/* Syntax Highlighted Background */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              padding: '12px',
              fontSize: '12px',
              lineHeight: '1.5',
              color: 'transparent',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            <HighlightedCode code={value} />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            spellCheck={false}
            className="relative w-full bg-transparent outline-none resize-vertical font-mono"
            style={{
              padding: '12px',
              fontSize: '13px',
              lineHeight: '1.5',
              minHeight,
              color: '#E6E1DC',
              border: 'none',
              caretColor: '#d4a853',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Syntax highlighting component
 */
function HighlightedCode({ code }: { code: string }) {
  const keywords = ['allow', 'deny', 'require', 'when', 'if', 'then', 'else', 'and', 'or', 'not'];
  const lines = code.split('\n');

  return (
    <>
      {lines.map((line, lineIdx) => (
        <div key={lineIdx}>
          {highlightLine(line, keywords)}
        </div>
      ))}
    </>
  );
}

function highlightLine(line: string, keywords: string[]) {
  const parts: React.ReactNode[] = [];
  let current = '';
  let inString = false;
  let stringChar: '"' | "'" | null = null;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    // String detection
    if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
      if (!inString) {
        if (current) {
          parts.push(highlightWord(current, keywords));
          current = '';
        }
        inString = true;
        stringChar = char;
        current = char;
      } else if (char === stringChar) {
        current += char;
        parts.push(
          <span key={i} style={{ color: '#A8FF60' }}>
            {current}
          </span>
        );
        current = '';
        inString = false;
        stringChar = null;
      } else {
        current += char;
      }
      continue;
    }

    if (inString) {
      current += char;
      continue;
    }

    // Comment detection
    if (char === '/' && line[i + 1] === '/') {
      if (current) {
        parts.push(highlightWord(current, keywords));
        current = '';
      }
      parts.push(
        <span key={i} style={{ color: 'var(--text-muted)' }}>
          {line.slice(i)}
        </span>
      );
      break;
    }

    // Word boundaries
    if (/\s/.test(char) || /[{}()[\],:]/.test(char)) {
      if (current) {
        parts.push(highlightWord(current, keywords));
        current = '';
      }
      parts.push(char);
    } else {
      current += char;
    }
  }

  // Flush remaining
  if (current) {
    if (inString) {
      parts.push(
        <span key="end" style={{ color: '#A8FF60' }}>
          {current}
        </span>
      );
    } else {
      parts.push(highlightWord(current, keywords));
    }
  }

  return <>{parts}</>;
}

function highlightWord(word: string, keywords: string[]): React.ReactNode {
  if (keywords.includes(word.toLowerCase())) {
    return (
      <span key={Math.random()} style={{ color: '#d4a853', fontWeight: 600 }}>
        {word}
      </span>
    );
  }
  return word;
}
