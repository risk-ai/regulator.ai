(()=>{var e={};e.id=2722,e.ids=[2722],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},35477:(e,t,o)=>{"use strict";o.r(t),o.d(t,{patchFetch:()=>u,routeModule:()=>l,serverHooks:()=>g,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>c});var n={};o.r(n),o.d(n,{POST:()=>p});var r=o(42706),i=o(28203),a=o(45994),s=o(39187);async function p(e){try{let{name:t,email:n,company:r,agentCount:i,useCase:a,plan:p}=await e.json();if(!t||!n)return s.NextResponse.json({error:"Name and email required"},{status:400});let l=process.env.POSTGRES_URL,d=!1;if(l)try{let{neon:e}=await o.e(2042).then(o.bind(o,12042)),s=e(l);await s`
          CREATE TABLE IF NOT EXISTS signups (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            company TEXT,
            plan TEXT DEFAULT 'community',
            source TEXT,
            agent_count TEXT,
            use_case TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `,await s`
          INSERT INTO signups (email, name, company, plan, agent_count, use_case, source)
          VALUES (${n}, ${t}, ${r||null}, ${p}, ${i||null}, ${a||null}, 'website')
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            company = EXCLUDED.company,
            plan = EXCLUDED.plan,
            agent_count = EXCLUDED.agent_count,
            use_case = EXCLUDED.use_case
        `,d=!0,console.log(`[Signup] Stored signup for ${n} in database`)}catch(e){console.error("[Signup] Database error:",e)}let c=process.env.RESEND_API_KEY;if(c&&await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Vienna OS <noreply@regulator.ai>",to:["admin@ai.ventures"],subject:`[Vienna OS] New signup: ${t} (${p})`,html:`
            <h2>New Vienna OS Signup</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Name:</strong></td><td>${t}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Email:</strong></td><td>${n}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Company:</strong></td><td>${r||"—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Plan:</strong></td><td>${p}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Agents:</strong></td><td>${i||"—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Use Case:</strong></td><td>${a||"—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Stored in DB:</strong></td><td>${d?"✓ Yes":"✗ No"}</td></tr>
            </table>
          `})}),c&&n)try{let e=t.split(" ")[0],o=function({name:e,firstName:t,email:o,plan:n,company:r}){return`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Vienna OS</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">
      🛡️
    </div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
      Welcome to Vienna OS
    </h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">
      Governed AI Execution Layer
    </p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">
      Hi ${t},
    </p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">
      Welcome to Vienna OS! You're now part of a platform that makes AI governance
      practical, not bureaucratic. Whether you're protecting against AI risks or
      ensuring compliance, Vienna OS has you covered.
    </p>

    <!-- Get Started Section -->
    <div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#2d3748;">
        🚀 Get Started in 3 Steps
      </h2>
      
      <!-- Step 1 -->
      <div style="margin-bottom:20px;">
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#4a5568;">
          1. Explore the Live Console
        </h3>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#718096;">
          See Vienna OS in action with our shared sandbox environment.
        </p>
        <a href="https://console.regulator.ai" style="display:inline-flex;align-items:center;background-color:#667eea;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:14px;font-weight:500;">
          Open Console →
        </a>
      </div>

      <!-- Step 2 -->
      <div style="margin-bottom:20px;">
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#4a5568;">
          2. Test the API
        </h3>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#718096;">
          Try a simple governance request to see how Vienna works.
        </p>
        <div style="background-color:#1a202c;color:#e2e8f0;padding:12px;border-radius:6px;font-size:12px;font-family:Monaco,'Cascadia Code','Roboto Mono',Consolas,'Times New Roman',monospace;overflow:auto;">
curl -X POST https://console.regulator.ai/api/v1/agent/intent \\<br/>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br/>
&nbsp;&nbsp;-d '{"action":"check_health","source":"test"}'
        </div>
      </div>

      <!-- Step 3 -->
      <div>
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#4a5568;">
          3. Read the Quickstart
        </h3>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#718096;">
          Learn how to integrate Vienna into your AI stack in under 10 minutes.
        </p>
        <a href="https://regulator.ai/docs" style="display:inline-flex;align-items:center;color:#667eea;text-decoration:none;font-size:14px;font-weight:500;">
          View Documentation →
        </a>
      </div>
    </div>

    ${"enterprise"===n?`
    <!-- Enterprise Section -->
    <div style="background-color:#fef5e7;border:2px solid #f6ad55;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#c05621;">
        🤝 Enterprise Setup
      </h3>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#9c4221;">
        Our team will reach out within 24 hours to discuss your enterprise deployment,
        compliance requirements, and custom governance policies.
      </p>
    </div>
    `:`
    <!-- Pro Tip Section -->
    <div style="background-color:#e6fffa;border:2px solid #38b2ac;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#234e52;">
        💡 Pro Tip
      </h3>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#285e61;">
        Start with simple health checks and governance policies. As you get comfortable,
        explore advanced features like warrant systems and multi-tier risk management.
      </p>
    </div>
    `}

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">
      Questions? Just reply to this email — our team reads every message.
    </p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">
      Welcome aboard!<br/>
      <strong>— The Vienna OS Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">
      Vienna OS by AI.Ventures
    </p>
    <p style="margin:0;font-size:12px;color:#a0aec0;">
      Sent to ${o} • <a href="#" style="color:#667eea;">Unsubscribe</a>
    </p>
  </div>
</div>

</body>
</html>
  `.trim()}({name:t,firstName:e,email:n,plan:p||"community",company:r});await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Vienna OS <hello@regulator.ai>",to:[n],subject:"Welcome to Vienna OS — Your AI Governance Journey Starts Here",html:o})}),console.log(`[Signup] Sent welcome email to ${n}`),console.log(`[Signup] Schedule getting-started email for ${n} in 1 day`),console.log(`[Signup] Schedule week-one email for ${n} in 7 days`),"community"===p&&console.log(`[Signup] Schedule pilot-offer email for ${n} in 14 days`)}catch(e){console.error("[Signup] Welcome email error:",e)}return s.NextResponse.json({success:!0,message:"Signup completed successfully",data:{stored:d,emailSent:!!c}})}catch(e){return console.error("Signup error:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}let l=new r.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/signup/route",pathname:"/api/signup",filename:"route",bundlePath:"app/api/signup/route"},resolvedPagePath:"/home/agentsnet/.openclaw/workspace/regulator.ai/apps/marketing/src/app/api/signup/route.ts",nextConfigOutput:"standalone",userland:n}),{workAsyncStorage:d,workUnitAsyncStorage:c,serverHooks:g}=l;function u(){return(0,a.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:c})}},96487:()=>{},78335:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),n=t.X(0,[638,5452],()=>o(35477));module.exports=n})();