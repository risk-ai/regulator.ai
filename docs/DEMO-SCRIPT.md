# Vienna OS — Demo Video Script (< 3 minutes)

_Target: Developer audience at Product Hunt / Hacker News launch_

---

## Scene 1: The Problem (0:00 - 0:20)

**Voiceover:**
> "AI agents are executing code, sending emails, making API calls — but who's watching?"
> 
> "LangChain, CrewAI, AutoGen — they build great agents. But none of them answer: who approved this action? Can you prove it to your auditor?"

**Visual:** Split screen — left shows an AI agent executing `rm -rf /`, right shows a compliance officer looking confused.

---

## Scene 2: Vienna OS in 10 seconds (0:20 - 0:35)

**Voiceover:**
> "Vienna OS is the governance layer that sits between your agent's intent and execution."
> 
> "Every action gets a risk tier, a policy check, and a cryptographic warrant. No warrant, no execution."

**Visual:** The pipeline diagram animating: Intent → Policy → Approval → Warrant → Execute → Verify → Audit

---

## Scene 3: Live Demo — /try Playground (0:35 - 1:30)

**Voiceover:**
> "Let me show you. This is regulator.ai/try — our interactive playground."

**Action:** Click "Wire Transfer $75K" scenario

> "A finance agent wants to wire $75,000. Vienna classifies this as T2 — multi-party approval required."

**Visual:** Pipeline steps animate one by one with timing

> "Policy engine matches: amount over $10K, requires treasury lead AND compliance officer approval."
> 
> "Both approve. Warrant issued — scoped to exactly $75,000, single-use, 120-second TTL."
> 
> "The transfer executes. Verification confirms the amount matches. Audit entry — immutable, tamper-evident."

**Action:** Show the warrant JSON with signature

> "That signature? HMAC-SHA256. Tamper with any field and the warrant invalidates."

**Action:** Click "Denied — Scope Creep" scenario

> "Now watch what happens when an agent tries something it shouldn't..."

**Visual:** Pipeline shows DENIED at policy engine, trust score drops, security alert fires

> "Analytics bot tried to export user data. Its scope is read-only. Denied. Trust score drops. Security team notified. All in 18 milliseconds."

---

## Scene 4: Integration — 5 Lines of Code (1:30 - 2:00)

**Voiceover:**
> "Adding Vienna to your existing agents? Five lines."

**Visual:** Code editor showing:
```python
from vienna_sdk import ViennaClient

client = ViennaClient(api_key="vos_your_key")
result = client.submit_intent(action="deploy_code", params={"service": "api"})

if result.status == "approved":
    deploy(result.warrant_id)
```

> "Works with LangChain, CrewAI, AutoGen, OpenClaw — any framework. TypeScript and Python SDKs."

**Action:** Show framework adapter imports

> "Or use our OpenClaw plugin for zero-code governance — just set two environment variables."

---

## Scene 5: What Makes This Different (2:00 - 2:30)

**Voiceover:**
> "Guardrails AI filters prompts. Arthur monitors models. Credo generates compliance docs."
> 
> "Vienna OS governs execution. We don't ask agents to behave — we remove their ability to misbehave."

**Visual:** Competitive comparison table

> "Cryptographic warrants. Four risk tiers. Natural language policy creation. AI-powered suggestions. Real-time event streaming. Full audit trail."
> 
> "And it's open source. Apache 2.0."

---

## Scene 6: CTA (2:30 - 2:50)

**Voiceover:**
> "Start free. Five agents. No credit card."
> 
> "regulator.ai — the control plane your agents answer to."

**Visual:** regulator.ai landing page → /signup → GitHub stars counter

---

## Production Notes

- **Length:** 2:50 target
- **Style:** Fast-paced, developer-focused, no corporate fluff
- **Music:** Lo-fi electronic, subtle
- **Recording:** Screen capture of regulator.ai/try + code editor + console
- **Narration:** Confident, concise, slightly irreverent
- **Thumbnail:** "Who approved this?" with a warrant specimen visual
