(()=>{var e={};e.id=1380,e.ids=[1380],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},79551:e=>{"use strict";e.exports=require("url")},97760:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>i.a,__next_app__:()=>d,pages:()=>p,routeModule:()=>m,tree:()=>c});var r=a(70260),n=a(28203),s=a(25155),i=a.n(s),o=a(67292),l={};for(let e in o)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>o[e]);a.d(t,l);let c=["",{children:["docs",{children:["integration-guide",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,86523)),"/home/agentsnet/.openclaw/workspace/regulator.ai/apps/marketing/src/app/docs/integration-guide/page.tsx"]}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,70440))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(a.bind(a,16437))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(a.bind(a,71354)),"/home/agentsnet/.openclaw/workspace/regulator.ai/apps/marketing/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(a.bind(a,50042)),"/home/agentsnet/.openclaw/workspace/regulator.ai/apps/marketing/src/app/not-found.tsx"],forbidden:[()=>Promise.resolve().then(a.t.bind(a,69116,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(a.t.bind(a,41485,23)),"next/dist/client/components/unauthorized-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,70440))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(a.bind(a,16437))).default(e)],twitter:[],manifest:void 0}}],p=["/home/agentsnet/.openclaw/workspace/regulator.ai/apps/marketing/src/app/docs/integration-guide/page.tsx"],d={require:a,loadChunk:()=>Promise.resolve()},m=new r.AppPageRouteModule({definition:{kind:n.RouteKind.APP_PAGE,page:"/docs/integration-guide/page",pathname:"/docs/integration-guide",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},4977:(e,t,a)=>{Promise.resolve().then(a.t.bind(a,13219,23)),Promise.resolve().then(a.t.bind(a,34863,23)),Promise.resolve().then(a.t.bind(a,25155,23)),Promise.resolve().then(a.t.bind(a,40802,23)),Promise.resolve().then(a.t.bind(a,9350,23)),Promise.resolve().then(a.t.bind(a,48530,23)),Promise.resolve().then(a.t.bind(a,88921,23))},4305:(e,t,a)=>{Promise.resolve().then(a.t.bind(a,66959,23)),Promise.resolve().then(a.t.bind(a,33875,23)),Promise.resolve().then(a.t.bind(a,88903,23)),Promise.resolve().then(a.t.bind(a,57174,23)),Promise.resolve().then(a.t.bind(a,84178,23)),Promise.resolve().then(a.t.bind(a,87190,23)),Promise.resolve().then(a.t.bind(a,61365,23))},17941:()=>{},59797:()=>{},96487:()=>{},78335:()=>{},86523:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>s,metadata:()=>n});var r=a(62740);let n={title:"Integration Guide — Connect Your Agent Framework",description:"Step-by-step guide to integrating Vienna OS with LangChain, CrewAI, AutoGen, OpenClaw, and other AI agent frameworks."};function s(){return(0,r.jsx)("main",{className:"min-h-screen bg-[#0B0F19] text-white",children:(0,r.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-20",children:[(0,r.jsx)("h1",{className:"text-4xl font-bold mb-4",children:"Integration Guide"}),(0,r.jsx)("p",{className:"text-gray-400 text-lg mb-12",children:"Connect any AI agent framework to Vienna OS in under 10 minutes."}),(0,r.jsxs)("section",{className:"mb-16",children:[(0,r.jsx)("h2",{className:"text-2xl font-semibold mb-6 text-purple-400",children:"Quick Start"}),(0,r.jsxs)("div",{className:"space-y-6",children:[(0,r.jsx)(i,{number:1,title:"Install the SDK",code:`npm install @vienna/sdk
# or
pip install vienna-sdk`}),(0,r.jsx)(i,{number:2,title:"Initialize the adapter",code:`import { createLangChainAdapter } from '@vienna/sdk';

const vienna = createLangChainAdapter({
  apiUrl: 'https://api.regulator.ai',
  apiKey: 'vos_your_api_key',
  agentId: 'my-langchain-agent'
});

// Register agent on startup
await vienna.register({
  name: 'My LangChain Agent',
  capabilities: ['deploy_code', 'send_email', 'query_database']
});`}),(0,r.jsx)(i,{number:3,title:"Submit intents before acting",code:`// Before executing any action, submit intent to Vienna
const result = await vienna.submitIntent({
  action: 'deploy_code',
  params: { service: 'api-gateway', version: '2.3.1' },
  objective: 'Deploy API v2.3.1 to production'
});

if (result.status === 'approved') {
  // Execute with warrant
  await deployService('api-gateway', '2.3.1');
  
  // Report execution result
  await vienna.reportExecution(result.warrant_id, {
    success: true,
    output: 'Deployed api-gateway v2.3.1'
  });
} else if (result.status === 'pending') {
  // T2/T3 — wait for human approval
  const approved = await vienna.waitForApproval(result.intent_id);
  if (approved.status === 'approved') {
    await deployService('api-gateway', '2.3.1');
    await vienna.reportExecution(approved.warrant_id, { success: true });
  }
}`})]})]}),(0,r.jsxs)("section",{className:"mb-16",children:[(0,r.jsx)("h2",{className:"text-2xl font-semibold mb-6 text-purple-400",children:"Framework Examples"}),(0,r.jsxs)("div",{className:"space-y-8",children:[(0,r.jsx)(o,{name:"LangChain / LangGraph",description:"Wrap tool calls with Vienna governance",code:`import { createLangChainAdapter } from '@vienna/sdk';

const vienna = createLangChainAdapter({
  apiUrl: 'https://api.regulator.ai',
  apiKey: process.env.VIENNA_API_KEY,
  agentId: 'langchain-agent-01'
});

// Create a governed tool
function governedTool(toolFn, action) {
  return async (...args) => {
    const result = await vienna.submitIntent({
      action,
      params: { args },
      objective: \`Execute \${action}\`
    });
    
    if (result.status !== 'approved') {
      throw new Error(\`Action \${action} requires approval\`);
    }
    
    const output = await toolFn(...args);
    await vienna.reportExecution(result.warrant_id, { 
      success: true, output: JSON.stringify(output) 
    });
    return output;
  };
}`}),(0,r.jsx)(o,{name:"CrewAI",description:"Add governance to crew task execution",code:`from vienna import create_crewai_adapter

vienna = create_crewai_adapter(
    api_url="https://api.regulator.ai",
    api_key=os.environ["VIENNA_API_KEY"],
    agent_id="crewai-research-crew"
)

# Before each task execution
result = vienna.submit_intent(
    action="web_search",
    params={"query": "AI governance market analysis"},
    objective="Research AI governance market for quarterly report"
)

if result["status"] == "approved":
    # Proceed with crew task
    crew.kickoff()
    vienna.report_execution(result["warrant_id"], success=True)`}),(0,r.jsx)(o,{name:"OpenClaw",description:"Native integration via OpenClaw bridge",code:`import { createOpenClawAdapter } from '@vienna/sdk';

const vienna = createOpenClawAdapter({
  apiUrl: 'https://api.regulator.ai',
  apiKey: process.env.VIENNA_API_KEY,
  agentId: 'openclaw-main-agent'
});

// OpenClaw sessions automatically route through Vienna
// when VIENNA_API_URL is set in environment`}),(0,r.jsx)(o,{name:"Microsoft AutoGen",description:"Govern multi-agent conversations",code:`from vienna import FrameworkAdapter

vienna = FrameworkAdapter(
    api_url="https://api.regulator.ai",
    api_key=os.environ["VIENNA_API_KEY"],
    agent_id="autogen-group-chat",
    framework="autogen"
)

# Wrap the GroupChatManager's execution step
# Each agent action goes through Vienna governance
result = vienna.submit_intent(
    action="code_execution",
    params={"language": "python", "sandbox": True},
    objective="Execute generated code in sandbox"
)`})]})]}),(0,r.jsxs)("section",{className:"mb-16",children:[(0,r.jsx)("h2",{className:"text-2xl font-semibold mb-6 text-purple-400",children:"API Reference"}),(0,r.jsxs)("div",{className:"space-y-6",children:[(0,r.jsx)(l,{method:"POST",path:"/api/v1/intents",description:"Submit an intent for governance evaluation",body:{agent_id:"string — Agent identifier",action:"string — Action to perform",params:"object — Action parameters",objective:"string — Human-readable description"},response:{intent_id:"string",status:"'approved' | 'pending' | 'denied'",risk_tier:"'T0' | 'T1' | 'T2' | 'T3'",warrant_id:"string (if approved)"}}),(0,r.jsx)(l,{method:"POST",path:"/api/v1/executions",description:"Report execution result after warrant-authorized action",body:{warrant_id:"string — Warrant that authorized this execution",success:"boolean — Whether execution succeeded",output:"string — Execution output"},response:{execution_id:"string",verified:"boolean"}}),(0,r.jsx)(l,{method:"POST",path:"/api/v1/agents",description:"Register an agent with Vienna OS",body:{agent_id:"string — Unique agent identifier",name:"string — Display name",capabilities:"string[] — Actions this agent can perform"},response:{registered:"boolean",agent_id:"string"}}),(0,r.jsx)(l,{method:"GET",path:"/api/v1/warrants/:warrantId",description:"Verify a warrant's validity",body:{},response:{valid:"boolean",warrant:"object — Full warrant details"}})]})]}),(0,r.jsxs)("section",{className:"mb-16",children:[(0,r.jsx)("h2",{className:"text-2xl font-semibold mb-6 text-purple-400",children:"Risk Tiers"}),(0,r.jsx)("div",{className:"overflow-x-auto",children:(0,r.jsxs)("table",{className:"w-full text-sm",children:[(0,r.jsx)("thead",{children:(0,r.jsxs)("tr",{className:"border-b border-gray-700 text-left",children:[(0,r.jsx)("th",{className:"py-3 pr-4 text-gray-400",children:"Tier"}),(0,r.jsx)("th",{className:"py-3 pr-4 text-gray-400",children:"Risk"}),(0,r.jsx)("th",{className:"py-3 pr-4 text-gray-400",children:"Approval"}),(0,r.jsx)("th",{className:"py-3 pr-4 text-gray-400",children:"Max TTL"}),(0,r.jsx)("th",{className:"py-3 text-gray-400",children:"Example"})]})}),(0,r.jsxs)("tbody",{className:"text-gray-300",children:[(0,r.jsxs)("tr",{className:"border-b border-gray-800",children:[(0,r.jsx)("td",{className:"py-3 pr-4 font-mono text-green-400",children:"T0"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"Informational"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"Auto"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"60 min"}),(0,r.jsx)("td",{className:"py-3",children:"Read file, check status"})]}),(0,r.jsxs)("tr",{className:"border-b border-gray-800",children:[(0,r.jsx)("td",{className:"py-3 pr-4 font-mono text-blue-400",children:"T1"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"Low"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"Policy auto"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"30 min"}),(0,r.jsx)("td",{className:"py-3",children:"Send email, create ticket"})]}),(0,r.jsxs)("tr",{className:"border-b border-gray-800",children:[(0,r.jsx)("td",{className:"py-3 pr-4 font-mono text-yellow-400",children:"T2"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"Medium"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"1 human"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"15 min"}),(0,r.jsx)("td",{className:"py-3",children:"Deploy code, modify DB"})]}),(0,r.jsxs)("tr",{children:[(0,r.jsx)("td",{className:"py-3 pr-4 font-mono text-red-400",children:"T3"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"High"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"2+ humans"}),(0,r.jsx)("td",{className:"py-3 pr-4",children:"5 min"}),(0,r.jsx)("td",{className:"py-3",children:"Wire transfer, delete prod"})]})]})]})})]}),(0,r.jsxs)("section",{className:"text-center py-12 border-t border-gray-800",children:[(0,r.jsx)("h2",{className:"text-2xl font-semibold mb-4",children:"Ready to govern your agents?"}),(0,r.jsx)("p",{className:"text-gray-400 mb-6",children:"Start with the free Community tier. No credit card required."}),(0,r.jsx)("a",{href:"/signup",className:"inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition",children:"Get Started Free"})]})]})})}function i({number:e,title:t,code:a}){return(0,r.jsxs)("div",{className:"bg-[#111826] rounded-lg p-6 border border-gray-800",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-4",children:[(0,r.jsx)("span",{className:"w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold",children:e}),(0,r.jsx)("h3",{className:"text-lg font-semibold",children:t})]}),(0,r.jsx)("pre",{className:"bg-[#0B0F19] rounded p-4 overflow-x-auto text-sm text-gray-300 font-mono",children:(0,r.jsx)("code",{children:a})})]})}function o({name:e,description:t,code:a}){return(0,r.jsxs)("div",{className:"bg-[#111826] rounded-lg p-6 border border-gray-800",children:[(0,r.jsx)("h3",{className:"text-lg font-semibold mb-1",children:e}),(0,r.jsx)("p",{className:"text-gray-400 text-sm mb-4",children:t}),(0,r.jsx)("pre",{className:"bg-[#0B0F19] rounded p-4 overflow-x-auto text-sm text-gray-300 font-mono",children:(0,r.jsx)("code",{children:a})})]})}function l({method:e,path:t,description:a,body:n,response:s}){let i="POST"===e?"text-green-400":"text-blue-400";return(0,r.jsxs)("div",{className:"bg-[#111826] rounded-lg p-6 border border-gray-800",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-2",children:[(0,r.jsx)("span",{className:`font-mono font-bold ${i}`,children:e}),(0,r.jsx)("span",{className:"font-mono text-gray-300",children:t})]}),(0,r.jsx)("p",{className:"text-gray-400 text-sm mb-4",children:a}),Object.keys(n).length>0&&(0,r.jsxs)("div",{className:"mb-3",children:[(0,r.jsx)("span",{className:"text-xs text-gray-500 uppercase tracking-wider",children:"Request Body"}),(0,r.jsx)("div",{className:"mt-1 space-y-1",children:Object.entries(n).map(([e,t])=>(0,r.jsxs)("div",{className:"text-sm",children:[(0,r.jsx)("span",{className:"font-mono text-purple-300",children:e}),(0,r.jsxs)("span",{className:"text-gray-500 ml-2",children:["— ",t]})]},e))})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("span",{className:"text-xs text-gray-500 uppercase tracking-wider",children:"Response"}),(0,r.jsx)("div",{className:"mt-1 space-y-1",children:Object.entries(s).map(([e,t])=>(0,r.jsxs)("div",{className:"text-sm",children:[(0,r.jsx)("span",{className:"font-mono text-green-300",children:e}),(0,r.jsxs)("span",{className:"text-gray-500 ml-2",children:["— ",t]})]},e))})]})]})}},71354:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>c,metadata:()=>l});var r=a(62740),n=a(31001),s=a.n(n),i=a(23463),o=a.n(i);a(61135);let l={title:{default:"Vienna OS — The Execution Control Layer for AI Systems",template:"%s | Vienna OS"},description:"Control what AI agents can do — not just what they say. Cryptographic execution warrants, risk tiering, policy enforcement, and immutable audit trails for autonomous AI systems.",metadataBase:new URL("https://regulator.ai"),openGraph:{title:"Vienna OS — The Execution Control Layer for AI Systems",description:"Control what AI agents can do. Cryptographic warrants, risk tiering, policy enforcement, and immutable audit trails.",url:"https://regulator.ai",siteName:"Vienna OS",type:"website",locale:"en_US",images:[{url:"/og-image.png",width:1200,height:630,alt:"Vienna OS — The Execution Control Layer for AI Systems"}]},twitter:{card:"summary_large_image",title:"Vienna OS — The Execution Control Layer for AI Systems",description:"Control what AI agents can do. Cryptographic warrants, risk tiering, and immutable audit trails.",images:["/og-image.png"]},robots:{index:!0,follow:!0,googleBot:{index:!0,follow:!0,"max-video-preview":-1,"max-image-preview":"large","max-snippet":-1}},icons:{icon:"/logo-icon.png",apple:"/logo-icon.png"},keywords:["AI governance","AI agent governance","agent control plane","execution warrants","AI compliance","agent approval workflow","policy enforcement","audit trail","Vienna OS","enterprise AI","AI risk management"],authors:[{name:"ai.ventures"}],creator:"ai.ventures"};function c({children:e}){return(0,r.jsxs)("html",{lang:"en",className:"dark",children:[(0,r.jsxs)("head",{children:[(0,r.jsx)("script",{type:"application/ld+json",dangerouslySetInnerHTML:{__html:JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication",name:"Vienna OS",alternateName:"regulator.ai",description:"Enterprise-grade governance layer for autonomous AI systems. Intent Gateway, policy enforcement, operator approval, cryptographic audit trails.",url:"https://regulator.ai",applicationCategory:"BusinessApplication",applicationSubCategory:"AI Governance Platform",operatingSystem:"Cross-platform",softwareVersion:"1.0.0",publisher:{"@type":"Organization",name:"ai.ventures",url:"https://ai.ventures"},offers:{"@type":"Offer",price:"0",priceCurrency:"USD",priceValidUntil:"2025-12-31",availability:"https://schema.org/InStock",name:"Community Edition",description:"Free tier with 5 agents and full pipeline"},features:["AI Agent Intent Gateway","Policy-as-Code Engine","Cryptographic Execution Warrants","Multi-tier Risk Assessment","Operator Approval Workflows","Real-time Verification Engine","Immutable Audit Trail","Compliance Reporting","Enterprise Integrations"],keywords:"AI governance, agent control plane, execution warrants, policy enforcement, audit trail, Vienna OS, enterprise AI, compliance, risk management",screenshot:"https://regulator.ai/screenshots/dashboard.png",featureList:["Govern autonomous AI agents at enterprise scale","Policy-based approval workflows with T0/T1/T2 risk tiers","Cryptographic warrants for authorized execution","Complete audit trail for regulatory compliance","Integrates with existing CI/CD and monitoring tools","Multi-party approval for high-risk operations","Real-time verification of agent actions","SOC 2, HIPAA, SEC compliant architecture"],audience:{"@type":"Audience",audienceType:"Enterprise",name:"Enterprise IT, DevOps, Compliance Teams"},mainEntity:{"@type":"FAQPage",mainEntity:[{"@type":"Question",name:"What is Vienna OS?",acceptedAnswer:{"@type":"Answer",text:"Vienna OS is an enterprise governance platform for autonomous AI agents. It sits between agent intent and execution, providing policy enforcement, approval workflows, and audit trails."}},{"@type":"Question",name:"How does risk tiering work?",acceptedAnswer:{"@type":"Answer",text:"Vienna OS classifies actions into T0 (auto-approved), T1 (single approval), and T2 (multi-party approval) based on risk assessment policies you define."}},{"@type":"Question",name:"Is Vienna OS compliant with regulations?",acceptedAnswer:{"@type":"Answer",text:"Yes, Vienna OS supports SOC 2, HIPAA, SEC, and EU AI Act compliance with appropriate policy configuration and audit trail retention."}}]}},null,2)}}),(0,r.jsx)("script",{async:!0,src:"https://www.googletagmanager.com/gtag/js?id=G-7LZLG0D79N"}),(0,r.jsx)("script",{dangerouslySetInnerHTML:{__html:`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-7LZLG0D79N');
            `}})]}),(0,r.jsxs)("body",{className:`${s().variable} ${o().variable} ${s().className}`,children:[(0,r.jsx)("a",{href:"#main-content",className:"sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium",children:"Skip to main content"}),e]})]})}},50042:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>s});var r=a(62740),n=a(81660);function s(){return(0,r.jsx)("div",{className:"min-h-screen bg-navy-900 flex items-center justify-center",children:(0,r.jsxs)("div",{className:"text-center px-6",children:[(0,r.jsx)(n.A,{className:"w-12 h-12 text-purple-400/30 mx-auto mb-6"}),(0,r.jsx)("h1",{className:"text-6xl font-bold text-white mb-2 font-mono",children:"404"}),(0,r.jsx)("p",{className:"text-slate-400 mb-8",children:"This page doesn't exist. The warrant was never issued."}),(0,r.jsxs)("div",{className:"flex items-center justify-center gap-4",children:[(0,r.jsx)("a",{href:"/",className:"bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm",children:"Back to Home"}),(0,r.jsx)("a",{href:"/docs",className:"text-sm text-slate-400 hover:text-white transition",children:"Read the Docs →"})]})]})})}},70440:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>n});var r=a(88077);let n=async e=>[{type:"image/x-icon",sizes:"16x16",url:(0,r.fillMetadataSegment)(".",await e.params,"favicon.ico")+""}]},16437:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>s}),a(62740);var r=a(88077);let n={runtime:"edge",alt:"Vienna OS — Governed AI Execution Layer",size:{width:1200,height:630},contentType:"image/png"};async function s(e){let{__metadata_id__:t,...a}=await e.params,s=(0,r.fillMetadataSegment)(".",a,"opengraph-image"),{generateImageMetadata:i}=n;function o(e,t){let a={alt:e.alt,type:e.contentType||"image/png",url:s+(t?"/"+t:"")+"?5786d842739b84f5"},{size:r}=e;return r&&(a.width=r.width,a.height=r.height),a}return i?(await i({params:a})).map((e,t)=>{let a=(e.id||t)+"";return o(e,a)}):[o(n,"")]}},61135:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[638,4648],()=>a(97760));module.exports=r})();