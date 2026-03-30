(()=>{var e={};e.id=5103,e.ids=[5103],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},77598:e=>{"use strict";e.exports=require("node:crypto")},27066:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>w,routeModule:()=>h,serverHooks:()=>f,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>y});var s={};r.r(s),r.d(s,{GET:()=>m,POST:()=>g});var n=r(42706),o=r(28203),i=r(45994),a=r(39187);let l=require("fs"),p="/tmp/newsletter-signups.json";async function d(){try{let e=await l.promises.readFile(p,"utf-8");return JSON.parse(e)}catch(e){return[]}}async function c(e){await l.promises.writeFile(p,JSON.stringify(e,null,2))}async function u(e){let t=process.env.RESEND_API_KEY;if(!t)return console.log("RESEND_API_KEY not set, skipping email send"),!1;try{let{Resend:s}=await r.e(4109).then(r.bind(r,64109)),n=new s(t);return await n.emails.send({from:"Vienna OS <updates@regulator.ai>",to:[e],subject:"Welcome to Vienna OS — Governance Layer for AI Agents",html:`
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0f172a; color: #cbd5e1;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h9"></path>
                <path d="m3 7 9 6 9-6"></path>
              </svg>
              <h1 style="color: white; font-size: 24px; font-weight: bold; margin: 0;">
                Vienna<span style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">OS</span>
              </h1>
            </div>
            <h2 style="color: #8b5cf6; font-size: 20px; margin: 0;">Welcome to the waitlist!</h2>
          </div>

          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <h3 style="color: white; font-size: 18px; margin-top: 0; margin-bottom: 16px;">What's Vienna OS?</h3>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              Vienna OS is the <strong style="color: #8b5cf6;">execution control layer</strong> for AI agent systems. 
              Instead of hoping agents behave correctly, we make misbehavior impossible through:
            </p>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong style="color: #06b6d4;">Cryptographic warrants</strong> — Every action requires authorization</li>
              <li><strong style="color: #06b6d4;">Risk-tiered approval</strong> — T0-T3 workflows based on impact</li>
              <li><strong style="color: #06b6d4;">Immutable audit trails</strong> — Complete governance records</li>
              <li><strong style="color: #06b6d4;">Policy enforcement</strong> — Automated rule evaluation</li>
            </ul>
          </div>

          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <h3 style="color: white; font-size: 18px; margin-top: 0; margin-bottom: 16px;">What happens next?</h3>
            <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>We'll notify you when Vienna OS enters public beta</li>
              <li>You'll get early access to the governance console</li>
              <li>Free tier includes governance for up to 3 AI agents</li>
              <li>Priority support during the beta period</li>
            </ol>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://regulator.ai/try" 
               style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
              Try the Interactive Demo
            </a>
          </div>

          <div style="text-align: center; border-top: 1px solid #334155; padding-top: 24px;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
              Vienna OS — The governance layer agents answer to
            </p>
            <p style="margin: 0; color: #475569; font-size: 12px;">
              \xa9 2026 Technetwork 2 LLC dba ai.ventures
            </p>
          </div>
        </div>
      `}),!0}catch(e){return console.error("Failed to send welcome email:",e),!1}}async function g(e){try{let{email:t}=await e.json();if(!t||"string"!=typeof t)return a.NextResponse.json({error:"Valid email address is required"},{status:400});let r=t.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))return a.NextResponse.json({error:"Please enter a valid email address"},{status:400});let s=await d();if(s.some(e=>e.email===r))return a.NextResponse.json({error:"This email is already on our waitlist"},{status:409});let n={email:r,timestamp:new Date().toISOString(),ip:e.headers.get("x-forwarded-for")||e.headers.get("x-real-ip")||void 0,userAgent:e.headers.get("user-agent")||void 0};s.push(n),await c(s);let o=await u(r);return console.log(`Newsletter signup: ${r} (email sent: ${o})`),a.NextResponse.json({success:!0,emailSent:o,message:"Successfully joined the waitlist"})}catch(e){return console.error("Newsletter signup error:",e),a.NextResponse.json({error:"Internal server error"},{status:500})}}async function m(){try{let e=(await d()).length;return a.NextResponse.json({count:e,message:`${e} signups so far`})}catch(e){return console.error("Newsletter count error:",e),a.NextResponse.json({error:"Internal server error"},{status:500})}}let h=new n.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/newsletter/route",pathname:"/api/newsletter",filename:"route",bundlePath:"app/api/newsletter/route"},resolvedPagePath:"/home/agentsnet/.openclaw/workspace/regulator.ai/apps/marketing/src/app/api/newsletter/route.ts",nextConfigOutput:"standalone",userland:s}),{workAsyncStorage:x,workUnitAsyncStorage:y,serverHooks:f}=h;function w(){return(0,i.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:y})}},96487:()=>{},78335:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[638,5452],()=>r(27066));module.exports=s})();