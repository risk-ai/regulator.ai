import{c as w,u as A,r as g,j as e,Z as T,w as E,b as x,C as I,S as N,M as P}from"./index-CY-7TTS4.js";import{P as O}from"./PageLayout-LABcrfg-.js";import{C as z,a as F}from"./copy-DSeDmmXQ.js";import{T as D}from"./terminal-DBWwPvSz.js";import{B as W}from"./bot-DAe4CH4l.js";/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]],R=w("brain",$);/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]],B=w("cloud",q);/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]],L=w("database",M);/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],V=w("settings",K),G=[{id:"python-sdk",name:"Python SDK",description:"Official Vienna OS Python client library",icon:"Code",status:"connected",category:"sdk",setupTime:"2 min",lastSync:"2 minutes ago",color:"#3b82f6"},{id:"nodejs-sdk",name:"Node.js SDK",description:"JavaScript/TypeScript client for Node.js",icon:"Code",status:"connected",category:"sdk",setupTime:"2 min",lastSync:"5 minutes ago",color:"#10b981"},{id:"rest-api",name:"REST API",description:"Direct HTTP API access for any language",icon:"Zap",status:"connected",category:"api",setupTime:"1 min",color:"#f59e0b"},{id:"openai",name:"OpenAI",description:"Govern GPT-4, o1, and other OpenAI models",icon:"Bot",status:"disconnected",category:"platform",setupTime:"5 min",color:"#06b6d4"},{id:"anthropic",name:"Anthropic",description:"Govern Claude models with Vienna warrants",icon:"Brain",status:"disconnected",category:"platform",setupTime:"5 min",color:"#8b5cf6"},{id:"postgres",name:"PostgreSQL",description:"Audit trail storage and policy evaluation",icon:"Database",status:"connected",category:"database",setupTime:"10 min",lastSync:"1 hour ago",color:"#3b82f6"},{id:"slack",name:"Slack",description:"Approval notifications and alerts",icon:"MessageSquare",status:"disconnected",category:"platform",setupTime:"3 min",color:"#e01e5a"},{id:"github",name:"GitHub Actions",description:"CI/CD governance for deployments",icon:"Settings",status:"disconnected",category:"platform",setupTime:"5 min",color:"#6b7280"}],H={slack:[{key:"webhook_url",label:"Webhook URL",type:"url",placeholder:"https://hooks.slack.com/services/...",required:!0}],pagerduty:[{key:"api_key",label:"API Key",type:"password",placeholder:"pd_api_...",required:!0},{key:"service_id",label:"Service ID",type:"text",placeholder:"PABC123",required:!0}],datadog:[{key:"api_key",label:"API Key",type:"password",placeholder:"dd_api_...",required:!0},{key:"app_key",label:"Application Key",type:"password",placeholder:"dd_app_...",required:!0},{key:"site",label:"Site",type:"text",placeholder:"us1 / eu1 / us3",required:!1}],openai:[{key:"api_key",label:"API Key",type:"password",placeholder:"sk-...",required:!0}],anthropic:[{key:"api_key",label:"API Key",type:"password",placeholder:"sk-ant-...",required:!0}],github:[{key:"token",label:"Personal Access Token",type:"password",placeholder:"ghp_...",required:!0},{key:"org",label:"Organization (optional)",type:"text",placeholder:"my-org",required:!1}]};function U({integration:n,onClose:r,onSaved:a}){const l=H[n.id]||[{key:"api_key",label:"API Key / Token",type:"password",placeholder:"Paste your key here",required:!0}],[d,f]=g.useState(()=>Object.fromEntries(l.map(c=>[c.key,""]))),[i,v]=g.useState(!1),[S,j]=g.useState(null),m=async c=>{c.preventDefault(),j(null);const b=l.filter(p=>{var y;return p.required&&!((y=d[p.key])!=null&&y.trim())});if(b.length){j(`Required: ${b.map(p=>p.label).join(", ")}`);return}v(!0);try{const p=localStorage.getItem("vienna_access_token"),y={"Content-Type":"application/json"};p&&(y.Authorization=`Bearer ${p}`);const o=await(await fetch("/api/v1/integrations",{method:"POST",headers:y,credentials:"include",body:JSON.stringify({type:n.id,name:n.name,config:d,enabled:!0})})).json();if(!o.success)throw new Error(o.error||"Save failed");a(n.id),r()}catch(p){j(p.message||"Failed to save integration")}finally{v(!1)}},_={width:"100%",padding:"8px 12px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(245,158,11,0.3)",color:"#e5e7eb",fontSize:"13px",fontFamily:"var(--font-mono)",borderRadius:"0",outline:"none",boxSizing:"border-box"};return e.jsxs("div",{style:{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"},children:[e.jsx("div",{onClick:r,style:{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)"}}),e.jsxs("div",{style:{position:"relative",width:"480px",background:"#0d1117",border:"1px solid rgba(245,158,11,0.4)",padding:"28px",boxShadow:"0 0 40px rgba(245,158,11,0.15)",zIndex:1},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"11px",color:"#f59e0b",fontFamily:"var(--font-mono)",letterSpacing:"0.1em",marginBottom:"4px"},children:"CONFIGURE INTEGRATION"}),e.jsx("div",{style:{fontSize:"16px",fontWeight:600,color:"#e5e7eb"},children:n.name})]}),e.jsx("button",{onClick:r,style:{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:"20px",padding:"4px"},children:"✕"})]}),e.jsxs("form",{onSubmit:m,children:[e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"16px"},children:l.map(c=>e.jsxs("div",{children:[e.jsxs("label",{style:{display:"block",fontSize:"11px",color:"#f59e0b",fontFamily:"var(--font-mono)",letterSpacing:"0.05em",marginBottom:"6px"},children:[c.label,c.required&&e.jsx("span",{style:{color:"#ef4444"},children:" *"})]}),e.jsx("input",{type:c.type==="password"?"password":c.type==="url"?"url":"text",placeholder:c.placeholder,value:d[c.key]||"",onChange:b=>f(p=>({...p,[c.key]:b.target.value})),style:_})]},c.key))}),S&&e.jsx("div",{style:{marginTop:"12px",padding:"8px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",fontSize:"12px"},children:S}),e.jsxs("div",{style:{display:"flex",gap:"8px",marginTop:"20px"},children:[e.jsx("button",{type:"submit",disabled:i,style:{flex:1,padding:"10px",background:i?"rgba(245,158,11,0.1)":"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.5)",color:"#f59e0b",fontSize:"11px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:i?"wait":"pointer",letterSpacing:"0.05em"},children:i?"CONNECTING...":"CONNECT"}),e.jsx("button",{type:"button",onClick:r,style:{padding:"10px 20px",background:"transparent",border:"1px solid rgba(107,114,128,0.4)",color:"#6b7280",fontSize:"11px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer"},children:"CANCEL"})]})]})]})]})}const Y=(n,r)=>{const a={size:28,color:r,strokeWidth:1.5};switch(n){case"Bot":return e.jsx(W,{...a});case"Brain":return e.jsx(R,{...a});case"Database":return e.jsx(L,{...a});case"MessageSquare":return e.jsx(P,{...a});case"Settings":return e.jsx(V,{...a});case"Terminal":return e.jsx(D,{...a});case"Code":return e.jsx(F,{...a});case"Cloud":return e.jsx(B,{...a});case"Shield":return e.jsx(N,{...a});default:return e.jsx(T,{...a})}};function Z({integration:n,onConnect:r,onTest:a}){const[l,d]=g.useState(!1),i={connected:{color:"#10b981",glow:"rgba(16, 185, 129, 0.4)",label:"CONNECTED",pulse:!0},disconnected:{color:"#6b7280",glow:"rgba(107, 114, 128, 0.2)",label:"NOT CONNECTED",pulse:!1},error:{color:"#ef4444",glow:"rgba(239, 68, 68, 0.4)",label:"ERROR",pulse:!0}}[n.status];return e.jsxs("div",{onMouseEnter:()=>d(!0),onMouseLeave:()=>d(!1),style:{background:"rgba(10, 14, 20, 0.6)",border:`1px solid ${i.color}40`,padding:"20px",display:"flex",flexDirection:"column",gap:"12px",boxShadow:l?`0 0 20px ${i.glow}`:`0 0 8px ${i.glow}`,transform:l?"translateY(-4px)":"translateY(0)",transition:"all 250ms cubic-bezier(0.4, 0, 0.2, 1)",position:"relative",overflow:"hidden"},children:[e.jsxs("div",{style:{position:"absolute",top:"16px",right:"16px",display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("div",{style:{fontSize:"9px",fontWeight:700,color:i.color,fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:i.label}),e.jsx("div",{style:{width:"8px",height:"8px",borderRadius:"50%",background:i.color,boxShadow:`0 0 8px ${i.glow}`,animation:i.pulse?"pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite":"none"}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px"},children:[e.jsx("div",{style:{width:"48px",height:"48px",display:"flex",alignItems:"center",justifyContent:"center",background:`${n.color}20`,border:`1px solid ${n.color}40`},children:Y(n.icon,n.color)}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"14px",fontWeight:700,color:"#E6E1DC"},children:n.name}),e.jsxs("div",{style:{fontSize:"10px",color:"rgba(230, 225, 220, 0.5)",fontFamily:"var(--font-mono)"},children:["Setup: ",n.setupTime]})]})]}),e.jsx("div",{style:{fontSize:"11px",color:"rgba(230, 225, 220, 0.7)",lineHeight:"1.4"},children:n.description}),n.lastSync&&e.jsxs("div",{style:{fontSize:"9px",color:"rgba(230, 225, 220, 0.4)",fontFamily:"var(--font-mono)",display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(E,{size:10}),"Last sync: ",n.lastSync]}),e.jsx("div",{style:{display:"flex",gap:"8px",marginTop:"8px"},children:n.status==="connected"?e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:a,style:{flex:1,padding:"8px 12px",background:`${n.color}20`,border:`1px solid ${n.color}40`,color:n.color,fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"TEST CONNECTION"}),e.jsx("button",{onClick:()=>r(),style:{padding:"8px 12px",background:"rgba(107, 114, 128, 0.2)",border:"1px solid rgba(107, 114, 128, 0.4)",color:"#6b7280",fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"CONFIGURE"})]}):e.jsx("button",{onClick:r,style:{flex:1,padding:"8px 12px",background:`${n.color}20`,border:`1px solid ${n.color}40`,color:n.color,fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"CONNECT NOW →"})}),e.jsx("style",{children:`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `})]})}function J({apiKey:n,onRevoke:r}){const[a,l]=g.useState(!1),d=()=>{navigator.clipboard.writeText(n.key),l(!0),x("API key copied to clipboard","success"),setTimeout(()=>l(!1),2e3)};return e.jsxs("div",{style:{background:"rgba(10, 14, 20, 0.6)",border:"1px solid rgba(251, 191, 36, 0.2)",padding:"16px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{style:{flex:1},children:[e.jsx("div",{style:{fontSize:"12px",fontWeight:600,color:"#E6E1DC",marginBottom:"6px"},children:n.name}),e.jsxs("div",{style:{fontSize:"11px",fontFamily:"var(--font-mono)",color:"rgba(230, 225, 220, 0.5)",display:"flex",alignItems:"center",gap:"8px"},children:[e.jsxs("span",{children:[n.key.slice(0,20),"..."]}),e.jsxs("button",{onClick:d,style:{padding:"4px 8px",background:a?"rgba(16, 185, 129, 0.2)":"rgba(251, 191, 36, 0.2)",border:`1px solid ${a?"rgba(16, 185, 129, 0.4)":"rgba(251, 191, 36, 0.4)"}`,color:a?"#10b981":"#fbbf24",fontSize:"9px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[a?e.jsx(I,{size:10}):e.jsx(z,{size:10}),a?"COPIED":"COPY"]})]}),e.jsxs("div",{style:{fontSize:"9px",color:"rgba(230, 225, 220, 0.4)",marginTop:"6px",fontFamily:"var(--font-mono)"},children:["Created: ",n.created," • Last used: ",n.lastUsed||"Never"]})]}),e.jsx("button",{onClick:r,style:{padding:"6px 12px",background:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.3)",color:"#ef4444",fontSize:"9px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:"REVOKE"})]})}function X({language:n,code:r}){const[a,l]=g.useState(!1),d=()=>{navigator.clipboard.writeText(r),l(!0),x(`${n} code copied`,"success"),setTimeout(()=>l(!1),2e3)};return e.jsxs("div",{style:{background:"#0A0E14",border:"1px solid rgba(251, 191, 36, 0.2)",overflow:"hidden"},children:[e.jsxs("div",{style:{padding:"10px 14px",borderBottom:"1px solid rgba(251, 191, 36, 0.15)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(251, 191, 36, 0.05)"},children:[e.jsx("div",{style:{fontSize:"10px",fontWeight:700,color:"#fbbf24",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:n.toUpperCase()}),e.jsxs("button",{onClick:d,style:{padding:"4px 10px",background:a?"rgba(16, 185, 129, 0.2)":"rgba(251, 191, 36, 0.2)",border:`1px solid ${a?"rgba(16, 185, 129, 0.4)":"rgba(251, 191, 36, 0.4)"}`,color:a?"#10b981":"#fbbf24",fontSize:"9px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[a?e.jsx(I,{size:10}):e.jsx(z,{size:10}),a?"COPIED":"COPY"]})]}),e.jsx("pre",{style:{padding:"14px",margin:0,fontSize:"11px",fontFamily:"var(--font-mono)",color:"#E6E1DC",lineHeight:"1.6",overflowX:"auto"},children:e.jsx("code",{children:r})})]})}function oe(){const n=A(),[r,a]=g.useState(G),[l,d]=g.useState([]),[f,i]=g.useState("python"),[v,S]=g.useState(null),j={python:`from vienna_os import ViennaClient

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
}`},m=g.useCallback(()=>{const t=localStorage.getItem("vienna_access_token"),o={"Content-Type":"application/json"};return t&&(o.Authorization=`Bearer ${t}`),o},[]);g.useEffect(()=>{const t=m();Promise.all([fetch("/api/v1/integrations",{credentials:"include",headers:t}).then(o=>o.json()).catch(()=>({success:!1})),fetch("/api/v1/api-keys",{credentials:"include",headers:t}).then(o=>o.json()).catch(()=>({success:!1}))]).then(([o,u])=>{if(o.success&&o.data){const s=new Map(o.data.map(h=>[h.type,h]));a(h=>h.map(k=>{const C=s.get(k.id);return C?{...k,status:C.enabled?"connected":"disconnected",lastSync:C.updated_at?new Date(C.updated_at).toLocaleString():void 0}:k}))}u.success&&u.data&&d(u.data.map(s=>({id:s.id,name:s.name,key:s.key_prefix||"••••••••",created:new Date(s.created_at).toLocaleDateString(),lastUsed:s.last_used_at?new Date(s.last_used_at).toLocaleString():"Never",permissions:s.permissions||[]})))})},[m]);const _=t=>{const o=r.find(u=>u.id===t);o&&S(o)},c=t=>{a(o=>o.map(u=>u.id===t?{...u,status:"connected",lastSync:"Just now"}:u)),x(`${t} connected successfully`,"success")},b=async t=>{x(`Testing ${t}...`,"info");const o=m();try{const s=await(await fetch(`/api/v1/integrations/${t}/test`,{method:"POST",credentials:"include",headers:o})).json();x(s.success?`${t} healthy`:`${t} test failed`,s.success?"success":"warning")}catch{x(`${t} test failed`,"error")}},p=async t=>{if(!confirm("Revoke this API key? This cannot be undone."))return;const o=m();try{const s=await(await fetch(`/api/v1/api-keys/${t}/revoke`,{method:"POST",credentials:"include",headers:o})).json();s.success?(d(h=>h.filter(k=>k.id!==t)),x("API key revoked","success")):x(`Failed: ${s.error}`,"error")}catch{x("Failed to revoke key","error")}},y=r.filter(t=>t.status==="connected").length;return e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{position:"relative",minHeight:"100vh"},children:e.jsx("div",{style:{position:"relative",zIndex:1},children:e.jsxs(O,{title:"",description:"",children:[e.jsx("div",{style:{background:"linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)",borderBottom:"1px solid rgba(251, 191, 36, 0.2)",padding:"20px",marginBottom:"20px"},children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{children:[e.jsx("h1",{style:{fontSize:"24px",fontWeight:700,color:"#06b6d4",margin:0,fontFamily:"var(--font-mono)",letterSpacing:"0.02em"},children:"🔌 INTEGRATIONS"}),e.jsxs("div",{style:{fontSize:"11px",color:"rgba(230, 225, 220, 0.5)",marginTop:"4px",fontFamily:"var(--font-mono)"},children:[y," of ",r.length," integrations connected"]})]}),e.jsxs("button",{onClick:()=>n("/api-keys"),style:{padding:"8px 16px",background:"rgba(6, 182, 212, 0.2)",border:"1px solid rgba(6, 182, 212, 0.4)",color:"#06b6d4",fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx(T,{size:12}),"CREATE API KEY"]})]})}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"24px"},children:[e.jsxs("div",{children:[e.jsx("h2",{style:{fontSize:"14px",fontWeight:700,color:"#fbbf24",marginBottom:"12px",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:"AVAILABLE INTEGRATIONS"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:"12px"},children:r.map(t=>e.jsx(Z,{integration:t,onConnect:()=>_(t.id),onTest:()=>b(t.id)},t.id))})]}),e.jsxs("div",{children:[e.jsx("h2",{style:{fontSize:"14px",fontWeight:700,color:"#fbbf24",marginBottom:"12px",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:"API KEYS"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"8px"},children:l.map(t=>e.jsx(J,{apiKey:t,onRevoke:()=>p(t.id)},t.id))})]}),e.jsxs("div",{children:[e.jsx("h2",{style:{fontSize:"14px",fontWeight:700,color:"#fbbf24",marginBottom:"12px",fontFamily:"var(--font-mono)",letterSpacing:"0.05em"},children:"SDK CODE EXAMPLES"}),e.jsx("div",{style:{display:"flex",gap:"8px",marginBottom:"12px"},children:["python","nodejs","go","rust"].map(t=>e.jsx("button",{onClick:()=>i(t),style:{padding:"8px 16px",background:f===t?"rgba(251, 191, 36, 0.2)":"rgba(107, 114, 128, 0.1)",border:`1px solid ${f===t?"rgba(251, 191, 36, 0.4)":"rgba(107, 114, 128, 0.2)"}`,color:f===t?"#fbbf24":"#6b7280",fontSize:"10px",fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:"0.05em"},children:t.toUpperCase()},t))}),e.jsx(X,{language:f,code:j[f]})]})]})]})})}),v&&e.jsx(U,{integration:v,onClose:()=>S(null),onSaved:c})]})}export{oe as IntegrationsPremium};
//# sourceMappingURL=IntegrationsPremium-GlCQqH00.js.map
