/**
 * Report Export Utilities — P2
 * 
 * Generate downloadable compliance reports (CSV + formatted text).
 * For PDF generation, we create a print-friendly HTML and trigger window.print().
 */

interface ReportSection {
  title: string;
  rows: string[][];
  headers?: string[];
}

/**
 * Export as CSV
 */
export function exportCSV(filename: string, sections: ReportSection[]): void {
  const lines: string[] = [];

  sections.forEach((section, i) => {
    if (i > 0) lines.push('');
    lines.push(`# ${section.title}`);
    if (section.headers) {
      lines.push(section.headers.join(','));
    }
    section.rows.forEach(row => {
      lines.push(row.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
          ? `"${escaped}"`
          : escaped;
      }).join(','));
    });
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export as printable HTML (triggers print dialog for PDF)
 */
export function exportPrintReport(title: string, sections: ReportSection[]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; padding: 40px; font-size: 12px; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #1a1a2e; }
    .subtitle { font-size: 11px; color: #666; margin-bottom: 24px; }
    .section { margin-bottom: 24px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #e5e5e5; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; color: #333; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 10px; color: #999; text-align: center; }
    .logo { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .logo-text { font-size: 16px; font-weight: 700; }
    .logo-text span { color: #7c3aed; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="logo">
    <div class="logo-text">Vienna<span>OS</span></div>
  </div>
  <h1>${title}</h1>
  <div class="subtitle">Generated: ${new Date().toLocaleString()} · Vienna OS Governance Console</div>
  
  ${sections.map(section => `
    <div class="section">
      <div class="section-title">${section.title}</div>
      <table>
        ${section.headers ? `<thead><tr>${section.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>` : ''}
        <tbody>
          ${section.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
  
  <div class="footer">
    © ${new Date().getFullYear()} Technetwork 2 LLC dba ai.ventures · Vienna OS Governance Report · Confidential
  </div>
  
  <script>
    setTimeout(() => window.print(), 500);
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
