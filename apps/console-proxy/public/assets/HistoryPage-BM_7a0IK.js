import{r as c,j as t,b as x}from"./index-GYj3PeiH.js";import{P as h}from"./PageLayout-Dz2sNY5C.js";function v(a,r){const o=[];r.forEach((n,l)=>{l>0&&o.push(""),o.push(`# ${n.title}`),n.headers&&o.push(n.headers.join(",")),n.rows.forEach(d=>{o.push(d.map(p=>{const s=String(p).replace(/"/g,'""');return s.includes(",")||s.includes('"')||s.includes(`
`)?`"${s}"`:s}).join(","))})});const e=new Blob([o.join(`
`)],{type:"text/csv;charset=utf-8;"});j(e,a)}function y(a,r){const o=window.open("","_blank");if(!o)return;const e=`
<!DOCTYPE html>
<html>
<head>
  <title>${a}</title>
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
  <h1>${a}</h1>
  <div class="subtitle">Generated: ${new Date().toLocaleString()} · Vienna OS Governance Console</div>
  
  ${r.map(n=>`
    <div class="section">
      <div class="section-title">${n.title}</div>
      <table>
        ${n.headers?`<thead><tr>${n.headers.map(l=>`<th>${l}</th>`).join("")}</tr></thead>`:""}
        <tbody>
          ${n.rows.map(l=>`<tr>${l.map(d=>`<td>${d}</td>`).join("")}</tr>`).join("")}
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
</html>`;o.document.write(e),o.document.close()}function j(a,r){const o=URL.createObjectURL(a),e=document.createElement("a");e.href=o,e.download=r,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(o)}const b={intent:{icon:"🎯",color:"#f59e0b",bg:"rgba(167, 139, 250, 0.08)",label:"Intent"},warrant:{icon:"🔐",color:"#f59e0b",bg:"rgba(245, 158, 11, 0.08)",label:"Warrant"},execution:{icon:"⚡",color:"#10b981",bg:"rgba(16, 185, 129, 0.08)",label:"Execution"},verification:{icon:"🔍",color:"#60a5fa",bg:"rgba(96, 165, 250, 0.08)",label:"Verification"},policy:{icon:"📋",color:"#34d399",bg:"rgba(52, 211, 153, 0.08)",label:"Policy"},anomaly:{icon:"⚠️",color:"#ef4444",bg:"rgba(239, 68, 68, 0.08)",label:"Anomaly"}},u={success:{color:"#10b981",bg:"rgba(16, 185, 129, 0.1)"},failed:{color:"#ef4444",bg:"rgba(239, 68, 68, 0.1)"},pending:{color:"#f59e0b",bg:"rgba(245, 158, 11, 0.1)"},rejected:{color:"#ef4444",bg:"rgba(239, 68, 68, 0.1)"}};function $(){const[a,r]=c.useState("24h"),[o,e]=c.useState("all"),[n,l]=c.useState([]),[d,p]=c.useState(!0);c.useEffect(()=>{s()},[a,o]);const s=async()=>{var i;p(!0);try{const g=await fetch("/api/v1/audit/recent?limit=50",{credentials:"include"});if(g.ok){const m=await g.json();l(((i=m.data)==null?void 0:i.entries)||[])}}catch{}p(!1)};return t.jsx(h,{title:"History",description:"Execution ledger — every action, warrant, and verification",actions:t.jsxs("div",{style:{display:"flex",gap:"8px"},children:[t.jsx(f,{value:a,onChange:r,options:[{value:"1h",label:"Last hour"},{value:"6h",label:"Last 6 hours"},{value:"24h",label:"Last 24 hours"},{value:"7d",label:"Last 7 days"}]}),t.jsx(f,{value:o,onChange:e,options:[{value:"all",label:"All types"},{value:"intent",label:"Intents"},{value:"execution",label:"Executions"},{value:"warrant",label:"Warrants"},{value:"verification",label:"Verifications"},{value:"policy",label:"Policy decisions"}]}),t.jsx("button",{onClick:()=>{if(n.length===0){x("No entries to export","warning");return}v(`vienna-audit-${new Date().toISOString().slice(0,10)}.csv`,[{title:"Audit Trail",headers:["ID","Type","Action","Status","Details","Timestamp"],rows:n.map(i=>[i.id,i.type,i.action,i.status,i.details||"",i.timestamp])}]),x(`Exported ${n.length} audit entries`,"success")},style:{padding:"6px 12px",fontSize:"12px",borderRadius:"6px",border:"1px solid rgba(16,185,129,0.2)",background:"rgba(16,185,129,0.08)",color:"#10b981",cursor:"pointer",fontWeight:500,fontFamily:"var(--font-mono)"},children:"📥 CSV"}),t.jsx("button",{onClick:()=>{if(n.length===0){x("No entries to export","warning");return}y("Vienna OS Governance Audit Report",[{title:`Audit Trail — ${a} · ${o==="all"?"All Types":o}`,headers:["ID","Type","Action","Status","Details","Timestamp"],rows:n.map(i=>[i.id.slice(0,12),i.type,i.action,i.status,i.details||"",new Date(i.timestamp).toLocaleString()])}])},style:{padding:"6px 12px",fontSize:"12px",borderRadius:"6px",border:"1px solid rgba(245,158,11,0.2)",background:"rgba(245,158,11,0.08)",color:"#f59e0b",cursor:"pointer",fontWeight:500,fontFamily:"var(--font-mono)"},children:"📄 PDF"})]}),children:n.length>0?t.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"4px"},children:n.map(i=>t.jsx(S,{entry:i},i.id))}):t.jsxs("div",{className:"empty-state",children:[t.jsx("div",{className:"empty-state-icon",children:"📋"}),t.jsx("h3",{className:"empty-state-title",children:d?"Loading audit trail…":"Audit trail is empty"}),t.jsx("p",{className:"empty-state-description",children:"Every governance action will appear here."})]})})}function S({entry:a}){const r=b[a.type]||b.intent,o=u[a.status]||u.success;return t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px",padding:"14px 20px 14px 16px",background:"var(--bg-primary)",borderRadius:"8px",border:"1px solid var(--border-subtle)",borderLeft:`4px solid ${r.color}`,transition:"all 200ms ease",cursor:"pointer",position:"relative",backdropFilter:"blur(8px)",backgroundImage:"linear-gradient(90deg, transparent 0%, rgba(124, 58, 237, 0.02) 50%, transparent 100%)"},onMouseEnter:e=>{e.currentTarget.style.transform="translateX(4px)",e.currentTarget.style.boxShadow=`0 4px 12px rgba(0, 0, 0, 0.15), 0 0 20px ${r.color}15`,e.currentTarget.style.borderLeftColor=r.color,e.currentTarget.style.borderLeftWidth="6px"},onMouseLeave:e=>{e.currentTarget.style.transform="translateX(0)",e.currentTarget.style.boxShadow="none",e.currentTarget.style.borderLeftWidth="4px"},children:[t.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",width:"32px",height:"32px",borderRadius:"50%",background:`linear-gradient(135deg, ${r.color}20, ${r.color}10)`,border:`1px solid ${r.color}30`,fontSize:"14px",flexShrink:0},children:r.icon}),t.jsxs("div",{style:{flex:1,minWidth:0},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"},children:[t.jsx("div",{style:{padding:"2px 8px",borderRadius:"4px",background:r.bg,fontSize:"10px",fontWeight:700,color:r.color,textTransform:"uppercase",letterSpacing:"0.5px",border:`1px solid ${r.color}25`},children:r.label}),t.jsx("div",{style:{padding:"2px 8px",borderRadius:"4px",background:o.bg,fontSize:"10px",fontWeight:600,color:o.color,textTransform:"uppercase",letterSpacing:"0.5px",border:`1px solid ${o.color}25`},children:a.status}),a.execution_id&&t.jsx("div",{style:{fontSize:"9px",color:"var(--text-muted)",fontFamily:"var(--font-mono)",background:"var(--bg-secondary)",padding:"1px 6px",borderRadius:"3px",border:"1px solid var(--border-subtle)"},children:a.execution_id.slice(0,12)})]}),t.jsx("div",{style:{fontSize:"13px",fontWeight:500,color:"var(--text-primary)",fontFamily:"var(--font-mono)",lineHeight:1.4},children:a.action})]}),t.jsxs("div",{style:{textAlign:"right",flexShrink:0},children:[t.jsx("div",{style:{fontSize:"11px",color:"var(--text-secondary)",fontFamily:"var(--font-mono)",fontWeight:600},children:new Date(a.timestamp).toLocaleTimeString()}),t.jsx("div",{style:{fontSize:"9px",color:"var(--text-tertiary)",fontFamily:"var(--font-mono)",marginTop:"1px"},children:new Date(a.timestamp).toLocaleDateString()})]})]})}function f({value:a,onChange:r,options:o}){return t.jsx("select",{value:a,onChange:e=>r(e.target.value),style:{background:"var(--bg-secondary)",border:"1px solid var(--border-default)",borderRadius:"8px",padding:"6px 12px",fontSize:"12px",color:"var(--text-secondary)",fontFamily:"var(--font-sans)",cursor:"pointer",outline:"none"},children:o.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})}export{$ as HistoryPage};
//# sourceMappingURL=HistoryPage-BM_7a0IK.js.map
