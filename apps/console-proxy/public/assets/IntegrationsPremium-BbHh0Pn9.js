import{c as p,r as l,j as e,Z as f,w as j,b as c,C as m,S,M as C}from"./index-DykConzn.js";import{P as w}from"./PageLayout-CDLm9YL4.js";import{A as k}from"./AnimatedGlobeBackground-DJbF51YZ.js";import{C as u,a as T}from"./copy-BOvDqj69.js";import{T as I}from"./terminal-C1Lr7Lma.js";import{B as _}from"./bot-C3ua0BSD.js";/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]],A=p("brain",z);/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]],N=p("cloud",E);/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]],R=p("database",P);/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],D=p("settings",W),O=[{id:"python-sdk",name:"Python SDK",description:"Official Vienna OS Python client library",icon:"Code",status:"connected",category:"sdk",setupTime:"2 min",lastSync:"2 minutes ago",color:"#3b82f6"},{id:"nodejs-sdk",name:"Node.js SDK",description:"JavaScript/TypeScript client for Node.js",icon:"Code",status:"connected",category:"sdk",setupTime:"2 min",lastSync:"5 minutes ago",color:"#10b981"},{id:"rest-api",name:"REST API",description:"Direct HTTP API access for any language",icon:"Zap",status:"connected",category:"api",setupTime:"1 min",color:"#f59e0b"},{id:"openai",name:"OpenAI",description:"Govern GPT-4, o1, and other OpenAI models",icon:"Bot",status:"disconnected",category:"platform",setupTime:"5 min",color:"#06b6d4"},{id:"anthropic",name:"Anthropic",description:"Govern Claude models with Vienna warrants",icon:"Brain",status:"disconnected",category:"platform",setupTime:"5 min",color:"#8b5cf6"},{id:"postgres",name:"PostgreSQL",description:"Audit trail storage and policy evaluation",icon:"Database",status:"connected",category:"database",setupTime:"10 min",lastSync:"1 hour ago",color:"#3b82f6"},{id:"slack",name:"Slack",description:"Approval notifications and alerts",icon:"MessageSquare",status:"disconnected",category:"platform",setupTime:"3 min",color:"#e01e5a"},{id:"github",name:"GitHub Actions",description:"CI/CD governance for deployments",icon:"Settings",status:"disconnected",category:"platform",setupTime:"5 min",color:"#6b7280"}],$=(t,i)=>{const n={size:28,color:i,strokeWidth:1.5};switch(t){case"Bot":return e.jsx(_,{...n});case"Brain":return e.jsx(A,{...n});case"Database":return e.jsx(R,{...n});case"MessageSquare":return e.jsx(C,{...n});case"Settings":return e.jsx(D,{...n});case"Terminal":return e.jsx(I,{...n});case"Code":return e.jsx(T,{...n});case"Cloud":return e.jsx(N,{...n});case"Shield":return e.jsx(S,{...n});default:return e.jsx(f,{...n})}};function F({integration:t,onConnect:i,onTest:n}){const[r,a]=l.useState(!1),s={connected:{color:"#10b981",glow:"rgba(16, 185, 129, 0.4)",label:"CONNECTED",pulse:!0},disconnected:{color:"#6b7280",glow:"rgba(107, 114, 128, 0.2)",label:"NOT CONNECTED",pulse:!1},error:{color:"#ef4444",glow:"rgba(239, 68, 68, 0.4)",label:"ERROR",pulse:!0}}[t.status];return e.jsxs("div",{onMouseEnter:()=>a(!0),onMouseLeave:()=>a(!1),style:{background:"rgba(10, 14, 20, 0.6)",border:`1px solid ${s.color}40`,padding:"20px",display:"flex",flexDirection:"column",gap:"12px",boxShadow:r?`0 0 20px ${s.glow}`:`0 0 8px ${s.glow}`,transform:r?"translateY(-4px)":"translateY(0)",transition:"all 250ms cubic-bezier(0.4, 0, 0.2, 1)",position:"relative",overflow:"hidden"},children:[e.jsxs("div",{style:{position:"absolute",top:"16px",right:"16px",display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("div",{style:{fontSize:"9px",fontWeight:700,color:s.color,fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:s.label}),e.jsx("div",{style:{width:"8px",height:"8px",borderRadius:"50%",background:s.color,boxShadow:`0 0 8px ${s.glow}`,animation:s.pulse?"pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite":"none"}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px"},children:[e.jsx("div",{style:{width:"48px",height:"48px",display:"flex",alignItems:"center",justifyContent:"center",background:`${t.color}20`,border:`1px solid ${t.color}40`},children:$(t.icon,t.color)}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"14px",fontWeight:700,color:"#E6E1DC"},children:t.name}),e.jsxs("div",{style:{fontSize:"10px",color:"rgba(230, 225, 220, 0.5)",fontFamily:"var(--font-mono)"},children:["Setup: ",t.setupTime]})]})]}),e.jsx("div",{style:{fontSize:"11px",color:"rgba(230, 225, 220, 0.7)",lineHeight:"1.4"},children:t.description}),t.lastSync&&e.jsxs("div",{style:{fontSize:"9px",color:"rgba(230, 225, 220, 0.4)",fontFamily:"var(--font-mono)",display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(j,{size:10}),"Last sync: ",t.lastSync]}),e.jsx("div",{style:{display:"flex",gap:"8px",marginTop:"8px"},children:t.status==="connected"?e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:n,style:{flex:1,padding:"8px 12px",background:`${t.color}20`,border:`1px solid ${t.color}40`,color:t.color,fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"TEST CONNECTION"}),e.jsx("button",{onClick:()=>window.location.href="/integrations",style:{padding:"8px 12px",background:"rgba(107, 114, 128, 0.2)",border:"1px solid rgba(107, 114, 128, 0.4)",color:"#6b7280",fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"CONFIGURE"})]}):e.jsx("button",{onClick:i,style:{flex:1,padding:"8px 12px",background:`${t.color}20`,border:`1px solid ${t.color}40`,color:t.color,fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"CONNECT NOW →"})}),e.jsx("style",{children:`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `})]})}function B({apiKey:t,onRevoke:i}){const[n,r]=l.useState(!1),a=()=>{navigator.clipboard.writeText(t.key),r(!0),c("API key copied to clipboard","success"),setTimeout(()=>r(!1),2e3)};return e.jsxs("div",{style:{background:"rgba(10, 14, 20, 0.6)",border:"1px solid rgba(251, 191, 36, 0.2)",padding:"16px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{style:{flex:1},children:[e.jsx("div",{style:{fontSize:"12px",fontWeight:600,color:"#E6E1DC",marginBottom:"6px"},children:t.name}),e.jsxs("div",{style:{fontSize:"11px",fontFamily:"var(--font-mono)",color:"rgba(230, 225, 220, 0.5)",display:"flex",alignItems:"center",gap:"8px"},children:[e.jsxs("span",{children:[t.key.slice(0,20),"..."]}),e.jsxs("button",{onClick:a,style:{padding:"4px 8px",background:n?"rgba(16, 185, 129, 0.2)":"rgba(251, 191, 36, 0.2)",border:`1px solid ${n?"rgba(16, 185, 129, 0.4)":"rgba(251, 191, 36, 0.4)"}`,color:n?"#10b981":"#fbbf24",fontSize:"9px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[n?e.jsx(m,{size:10}):e.jsx(u,{size:10}),n?"COPIED":"COPY"]})]}),e.jsxs("div",{style:{fontSize:"9px",color:"rgba(230, 225, 220, 0.4)",marginTop:"6px",fontFamily:"var(--font-mono)"},children:["Created: ",t.created," • Last used: ",t.lastUsed||"Never"]})]}),e.jsx("button",{onClick:i,style:{padding:"6px 12px",background:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.3)",color:"#ef4444",fontSize:"9px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"REVOKE"})]})}function M({language:t,code:i}){const[n,r]=l.useState(!1),a=()=>{navigator.clipboard.writeText(i),r(!0),c(`${t} code copied`,"success"),setTimeout(()=>r(!1),2e3)};return e.jsxs("div",{style:{background:"#0A0E14",border:"1px solid rgba(251, 191, 36, 0.2)",overflow:"hidden"},children:[e.jsxs("div",{style:{padding:"10px 14px",borderBottom:"1px solid rgba(251, 191, 36, 0.15)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(251, 191, 36, 0.05)"},children:[e.jsx("div",{style:{fontSize:"10px",fontWeight:700,color:"#fbbf24",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:t.toUpperCase()}),e.jsxs("button",{onClick:a,style:{padding:"4px 10px",background:n?"rgba(16, 185, 129, 0.2)":"rgba(251, 191, 36, 0.2)",border:`1px solid ${n?"rgba(16, 185, 129, 0.4)":"rgba(251, 191, 36, 0.4)"}`,color:n?"#10b981":"#fbbf24",fontSize:"9px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[n?e.jsx(m,{size:10}):e.jsx(u,{size:10}),n?"COPIED":"COPY"]})]}),e.jsx("pre",{style:{padding:"14px",margin:0,fontSize:"11px",fontFamily:"var(--font-mono)",color:"#E6E1DC",lineHeight:"1.6",overflowX:"auto"},children:e.jsx("code",{children:i})})]})}function U(){const[t,i]=l.useState(O),[n,r]=l.useState([{id:"key-1",name:"Production API Key",key:"vienna_live_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",created:"2026-04-01",lastUsed:"2 hours ago",permissions:["read:agents","write:warrants","read:policies"]},{id:"key-2",name:"Development API Key",key:"vienna_test_1234567890abcdef1234567890abcdef",created:"2026-03-15",lastUsed:"1 day ago",permissions:["read:agents","read:policies"]}]),[a,x]=l.useState("python"),s={python:`from vienna_os import ViennaClient

# Initialize client
client = ViennaClient(api_key="vienna_live_...")

# Register an agent
agent = client.agents.create(
    name="data-processor",
    capabilities=["database_write", "api_call"],
    trust_score=85
)

# Request a warrant
warrant = client.warrants.create(
    agent_id=agent.id,
    action_type="database_write",
    resource="users_table",
    environment="production"
)

print(f"Warrant issued: {warrant.id}")
print(f"TTL: {warrant.ttl}s")`,nodejs:`import { ViennaClient } from 'vienna-os';

// Initialize client
const client = new ViennaClient({
  apiKey: 'vienna_live_...'
});

// Register an agent
const agent = await client.agents.create({
  name: 'data-processor',
  capabilities: ['database_write', 'api_call'],
  trustScore: 85
});

// Request a warrant
const warrant = await client.warrants.create({
  agentId: agent.id,
  actionType: 'database_write',
  resource: 'users_table',
  environment: 'production'
});

console.log(\`Warrant issued: \${warrant.id}\`);
console.log(\`TTL: \${warrant.ttl}s\`);`,go:`package main

import (
    "fmt"
    "github.com/vienna-os/vienna-go"
)

func main() {
    // Initialize client
    client := vienna.NewClient("vienna_live_...")

    // Register an agent
    agent, err := client.Agents.Create(&vienna.AgentCreate{
        Name:         "data-processor",
        Capabilities: []string{"database_write", "api_call"},
        TrustScore:   85,
    })
    if err != nil {
        panic(err)
    }

    // Request a warrant
    warrant, err := client.Warrants.Create(&vienna.WarrantCreate{
        AgentID:     agent.ID,
        ActionType:  "database_write",
        Resource:    "users_table",
        Environment: "production",
    })
    if err != nil {
        panic(err)
    }

    fmt.Printf("Warrant issued: %s\\n", warrant.ID)
    fmt.Printf("TTL: %ds\\n", warrant.TTL)
}`,rust:`use vienna_os::{ViennaClient, AgentCreate, WarrantCreate};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize client
    let client = ViennaClient::new("vienna_live_...");

    // Register an agent
    let agent = client.agents.create(AgentCreate {
        name: "data-processor".to_string(),
        capabilities: vec!["database_write", "api_call"],
        trust_score: 85,
    }).await?;

    // Request a warrant
    let warrant = client.warrants.create(WarrantCreate {
        agent_id: agent.id.clone(),
        action_type: "database_write".to_string(),
        resource: "users_table".to_string(),
        environment: "production".to_string(),
    }).await?;

    println!("Warrant issued: {}", warrant.id);
    println!("TTL: {}s", warrant.ttl);

    Ok(())
}`},y=o=>{c(`Connecting ${o}...`,"info"),setTimeout(()=>{i(g=>g.map(d=>d.id===o?{...d,status:"connected",lastSync:"Just now"}:d)),c(`${o} connected successfully`,"success")},1500)},b=o=>{c(`Testing ${o} connection...`,"info"),setTimeout(()=>{c(`${o} connection healthy`,"success")},1e3)},h=o=>{confirm("Revoke this API key? This cannot be undone.")&&(r(g=>g.filter(d=>d.id!==o)),c("API key revoked","success"))},v=t.filter(o=>o.status==="connected").length;return e.jsxs("div",{style:{position:"relative",minHeight:"100vh"},children:[e.jsx(k,{}),e.jsx("div",{style:{position:"relative",zIndex:1},children:e.jsxs(w,{title:"",description:"",children:[e.jsx("div",{style:{background:"linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)",borderBottom:"1px solid rgba(251, 191, 36, 0.2)",padding:"20px",marginBottom:"20px"},children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{children:[e.jsx("h1",{style:{fontSize:"24px",fontWeight:700,color:"#06b6d4",margin:0,fontFamily:"var(--font-mono)",letterSpacing:"0.02em"},children:"🔌 INTEGRATIONS"}),e.jsxs("div",{style:{fontSize:"11px",color:"rgba(230, 225, 220, 0.5)",marginTop:"4px",fontFamily:"var(--font-mono)"},children:[v," of ",t.length," integrations connected"]})]}),e.jsxs("button",{onClick:()=>window.location.href="/api-keys",style:{padding:"8px 16px",background:"rgba(6, 182, 212, 0.2)",border:"1px solid rgba(6, 182, 212, 0.4)",color:"#06b6d4",fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx(f,{size:12}),"CREATE API KEY"]})]})}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"24px"},children:[e.jsxs("div",{children:[e.jsx("h2",{style:{fontSize:"14px",fontWeight:700,color:"#fbbf24",marginBottom:"12px",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:"AVAILABLE INTEGRATIONS"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:"12px"},children:t.map(o=>e.jsx(F,{integration:o,onConnect:()=>y(o.id),onTest:()=>b(o.id)},o.id))})]}),e.jsxs("div",{children:[e.jsx("h2",{style:{fontSize:"14px",fontWeight:700,color:"#fbbf24",marginBottom:"12px",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:"API KEYS"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"8px"},children:n.map(o=>e.jsx(B,{apiKey:o,onRevoke:()=>h(o.id)},o.id))})]}),e.jsxs("div",{children:[e.jsx("h2",{style:{fontSize:"14px",fontWeight:700,color:"#fbbf24",marginBottom:"12px",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:"SDK CODE EXAMPLES"}),e.jsx("div",{style:{display:"flex",gap:"8px",marginBottom:"12px"},children:["python","nodejs","go","rust"].map(o=>e.jsx("button",{onClick:()=>x(o),style:{padding:"8px 16px",background:a===o?"rgba(251, 191, 36, 0.2)":"rgba(107, 114, 128, 0.1)",border:`1px solid ${a===o?"rgba(251, 191, 36, 0.4)":"rgba(107, 114, 128, 0.2)"}`,color:a===o?"#fbbf24":"#6b7280",fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:o.toUpperCase()},o))}),e.jsx(M,{language:a,code:s[a]})]})]})]})})]})}export{U as IntegrationsPremium};
//# sourceMappingURL=IntegrationsPremium-BbHh0Pn9.js.map
