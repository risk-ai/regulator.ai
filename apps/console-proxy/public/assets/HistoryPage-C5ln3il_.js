import{r as c,j as e,b as p,F as u,R as v}from"./index-D8zuIph_.js";import{C as w}from"./clock-Dw5tnbFO.js";import{D as j}from"./download-De1u2mou.js";function y(o,n){const a=[];n.forEach((i,l)=>{l>0&&a.push(""),a.push(`# ${i.title}`),i.headers&&a.push(i.headers.join(",")),i.rows.forEach(d=>{a.push(d.map(x=>{const s=String(x).replace(/"/g,'""');return s.includes(",")||s.includes('"')||s.includes(`
`)?`"${s}"`:s}).join(","))})});const r=new Blob([a.join(`
`)],{type:"text/csv;charset=utf-8;"});$(r,o)}function N(o,n){const a=window.open("","_blank");if(!a)return;const r=`
<!DOCTYPE html>
<html>
<head>
  <title>${o}</title>
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
  <h1>${o}</h1>
  <div class="subtitle">Generated: ${new Date().toLocaleString()} · Vienna OS Governance Console</div>
  
  ${n.map(i=>`
    <div class="section">
      <div class="section-title">${i.title}</div>
      <table>
        ${i.headers?`<thead><tr>${i.headers.map(l=>`<th>${l}</th>`).join("")}</tr></thead>`:""}
        <tbody>
          ${i.rows.map(l=>`<tr>${l.map(d=>`<td>${d}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `).join("")}
  
  <div class="footer">
    © ${new Date().getFullYear()} Technetwork 2 LLC dba ai.ventures · Vienna OS Governance Report · Confidential
  </div>
  
  <script>
    setTimeout(() => window.print(), 500);
  <\/script>
</body>
</html>`;a.document.write(r),a.document.close()}function $(o,n){const a=URL.createObjectURL(o),r=document.createElement("a");r.href=a,r.download=n,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(a)}const h={intent:{icon:"🎯",color:"text-amber-400",bg:"bg-amber-500/10",border:"border-amber-500/20",label:"Intent"},warrant:{icon:"🔐",color:"text-amber-400",bg:"bg-amber-500/10",border:"border-amber-500/20",label:"Warrant"},execution:{icon:"⚡",color:"text-emerald-400",bg:"bg-emerald-500/10",border:"border-emerald-500/20",label:"Execution"},verification:{icon:"🔍",color:"text-blue-400",bg:"bg-blue-500/10",border:"border-blue-500/20",label:"Verification"},policy:{icon:"📋",color:"text-cyan-400",bg:"bg-cyan-500/10",border:"border-cyan-500/20",label:"Policy"},anomaly:{icon:"⚠️",color:"text-red-400",bg:"bg-red-500/10",border:"border-red-500/20",label:"Anomaly"}},g={success:{color:"text-emerald-400",bg:"bg-emerald-500/10",dot:"bg-emerald-500"},failed:{color:"text-red-400",bg:"bg-red-500/10",dot:"bg-red-500"},pending:{color:"text-amber-400",bg:"bg-amber-500/10",dot:"bg-amber-500 animate-pulse"},rejected:{color:"text-red-400",bg:"bg-red-500/10",dot:"bg-red-500"}};function S({entry:o}){const n=h[o.type]||h.intent,a=g[o.status]||g.success,r=o.type==="anomaly";return e.jsx("div",{className:`bg-[#12131a] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.12] transition-all group ${r?"shadow-[0_0_12px_rgba(239,68,68,0.15)]":""}`,children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsxs("div",{className:"flex flex-col items-center pt-1",children:[e.jsx("div",{className:`w-8 h-8 rounded-lg ${n.bg} border ${n.border} flex items-center justify-center text-sm`,children:n.icon}),e.jsx("div",{className:"w-[2px] flex-1 bg-white/[0.06] mt-2 min-h-[12px]"})]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap mb-1.5",children:[e.jsx("span",{className:`px-2 py-0.5 rounded ${n.bg} ${n.color} text-[9px] font-bold font-mono uppercase border ${n.border}`,children:n.label}),e.jsxs("span",{className:`inline-flex items-center gap-1 px-2 py-0.5 rounded ${a.bg} ${a.color} text-[9px] font-bold font-mono uppercase`,children:[e.jsx("span",{className:`w-1.5 h-1.5 rounded-full ${a.dot}`}),o.status]}),o.execution_id&&e.jsx("span",{className:"px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.06] rounded text-[8px] font-mono text-white/25",children:o.execution_id.slice(0,12)})]}),e.jsx("div",{className:"text-[12px] font-medium text-white font-mono",children:o.action}),o.details&&e.jsx("div",{className:"text-[10px] text-white/35 mt-1 font-mono",children:o.details})]}),e.jsxs("div",{className:"text-right flex-shrink-0",children:[e.jsx("div",{className:"text-[11px] font-bold font-mono text-white/50",children:new Date(o.timestamp).toLocaleTimeString()}),e.jsx("div",{className:"text-[9px] font-mono text-white/20",children:new Date(o.timestamp).toLocaleDateString()})]})]})})}function D(){const[o,n]=c.useState("24h"),[a,r]=c.useState("all"),[i,l]=c.useState([]),[d,x]=c.useState(!0);c.useEffect(()=>{s()},[o,a]);const s=async()=>{var t;x(!0);try{const b=await fetch("/api/v1/audit/recent?limit=50",{credentials:"include"});if(b.ok){const f=await b.json();l(((t=f.data)==null?void 0:t.entries)||[])}}catch{}finally{x(!1)}},m=a==="all"?i:i.filter(t=>t.type===a);return e.jsxs("div",{className:"min-h-screen",children:[e.jsxs("div",{className:"flex justify-between items-start mb-6",children:[e.jsxs("div",{children:[e.jsxs("h1",{className:"text-[22px] font-bold text-white tracking-tight flex items-center gap-3",children:[e.jsx(w,{className:"text-amber-400",size:20}),"History"]}),e.jsx("p",{className:"text-[12px] text-white/40 mt-1 font-mono",children:"Execution ledger — every action, warrant, and verification"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:()=>{if(!i.length){p("No entries","warning");return}y(`vienna-audit-${new Date().toISOString().slice(0,10)}.csv`,[{title:"Audit Trail",headers:["ID","Type","Action","Status","Details","Timestamp"],rows:i.map(t=>[t.id,t.type,t.action,t.status,t.details||"",t.timestamp])}]),p(`Exported ${i.length} entries`,"success")},className:"px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-bold font-mono text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5",children:[e.jsx(j,{size:10})," CSV"]}),e.jsxs("button",{onClick:()=>{if(!i.length){p("No entries","warning");return}N("Vienna OS Governance Audit Report",[{title:`Audit Trail — ${o}`,headers:["ID","Type","Action","Status","Details","Timestamp"],rows:i.map(t=>[t.id.slice(0,12),t.type,t.action,t.status,t.details||"",new Date(t.timestamp).toLocaleString()])}])},className:"px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[10px] font-bold font-mono text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5",children:[e.jsx(u,{size:10})," PDF"]}),e.jsx("button",{onClick:s,className:"px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-[10px] font-bold font-mono text-white/50 hover:text-white transition-all flex items-center gap-1.5",children:e.jsx(v,{size:10})})]})]}),e.jsxs("div",{className:"flex items-center gap-3 mb-5",children:[e.jsx("div",{className:"flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1 gap-0.5",children:[{v:"1h",l:"1h"},{v:"6h",l:"6h"},{v:"24h",l:"24h"},{v:"7d",l:"7d"}].map(t=>e.jsx("button",{onClick:()=>n(t.v),className:`px-3 py-1 rounded text-[10px] font-bold font-mono transition-all ${o===t.v?"bg-white/[0.08] text-white":"text-white/30 hover:text-white/50"}`,children:t.l},t.v))}),e.jsx("div",{className:"flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1 gap-0.5",children:[{v:"all",l:"All"},{v:"intent",l:"Intents"},{v:"execution",l:"Execs"},{v:"warrant",l:"Warrants"},{v:"verification",l:"Verify"},{v:"policy",l:"Policy"}].map(t=>e.jsx("button",{onClick:()=>r(t.v),className:`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-all ${a===t.v?"bg-amber-500/15 text-amber-400":"text-white/30 hover:text-white/50"}`,children:t.l},t.v))}),e.jsxs("span",{className:"text-[10px] font-mono text-white/20 ml-auto",children:[m.length," entries"]})]}),d?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20",children:[e.jsx("div",{className:"w-8 h-8 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin mb-4"}),e.jsx("span",{className:"text-[11px] font-mono text-white/30",children:"Loading audit trail..."})]}):m.length===0?e.jsxs("div",{className:"text-center py-20 bg-[#12131a] border border-white/[0.06] rounded-lg",children:[e.jsx("div",{className:"text-3xl mb-3",children:"📋"}),e.jsx("h3",{className:"text-[14px] font-bold text-white mb-1",children:i.length===0?"Audit trail is empty":"No matching entries"}),e.jsx("p",{className:"text-[11px] text-white/30",children:"Every governance action will appear here."})]}):e.jsx("div",{className:"space-y-2",children:m.map(t=>e.jsx(S,{entry:t},t.id))})]})}export{D as HistoryPage};
//# sourceMappingURL=HistoryPage-C5ln3il_.js.map
