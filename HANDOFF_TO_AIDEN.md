# Vienna → Aiden Handoff — Content & Marketing Items

**Date:** 2026-03-31  
**Status:** Technical foundation complete (7/11 items). Remaining 4 items require content/marketing work.

---

## Completed (Vienna — Technical Lead)

✅ **1. SDK tests + examples directory**
- 16 Vitest tests (100% passing)
- 5 practical examples in `sdk/node/examples/`
- Covers full integration workflow
- Documentation: `sdk/node/examples/README.md`

✅ **2. CONTRIBUTING.md + issue templates (Technical setup)**
- Updated for current architecture (PostgreSQL, console-proxy)
- Added technical question template
- SDK test documentation
- Development environment instructions

✅ **4. Swagger UI at /api/v1/docs**
- Interactive API documentation live
- URL: https://api.regulator.ai/api/v1/docs
- Loads from `openapi.yaml`

✅ **7. Google/GitHub OAuth (SSO)**
- Passport.js integration
- Routes: `/api/v1/auth/google` + `/api/v1/auth/github`
- Auto-creates tenant + user on first login

✅ **8. Staging environment + deploy-on-merge CI**
- Workflows: `deploy-staging.yml` + `deploy-production.yml`
- Auto-deploys on push to `develop` (staging) or `main` (production)
- Smoke tests + PR comments with staging URLs

✅ **9. Customer portal backend**
- Endpoint: `POST /api/v1/billing/portal`
- Returns Stripe customer portal session URL
- Ready for frontend integration

✅ **10. Docker setup for self-hosting**
- `Dockerfile` (production-ready)
- `docker-compose.yml` (PostgreSQL + backend + frontend)
- Documentation: `DOCKER.md`

---

## Remaining (Aiden — Marketing Lead)

### Item 2: CONTRIBUTING.md (Community Guidelines)
**Vienna completed:** Technical setup, dev environment  
**Aiden's scope:** Community guidelines, code of conduct philosophy, contribution culture

**Action:**
- Add section on community culture (what makes a good contributor)
- Expand "Recognition" section (contributor spotlights, badges)
- Add "Getting Help" best practices (Discord etiquette, response times)

**Priority:** Low (current CONTRIBUTING.md is functional)

---

### Item 3: Welcome Email Drip (3 emails via Resend)
**Status:** Backend ready (Resend API key in `.env.console`)  
**Aiden's scope:** Write email copy + implement drip sequence

**Action:**
1. Create 3-email sequence:
   - **Email 1 (Day 0):** Welcome, verify email, first steps
   - **Email 2 (Day 3):** Submit your first intent (guide + example)
   - **Email 3 (Day 7):** Advanced features (policies, agent templates)

2. Implement in `/apps/console-proxy/api/v1/auth.js` (register endpoint)

3. Use Resend API:
   ```javascript
   const { Resend } = require('resend');
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   await resend.emails.send({
     from: 'Vienna OS <hello@regulator.ai>',
     to: user.email,
     subject: 'Welcome to Vienna OS',
     html: '<html>...</html>'
   });
   ```

**Priority:** High (improves activation rate)

---

### Item 5: 5+ Blog Posts (AI Governance Topics)
**Location:** `/apps/marketing/pages/blog/`  
**Aiden's scope:** Write + publish 5 blog posts

**Suggested Topics:**
1. **"What is AI Governance? A Beginner's Guide"**
   - Target: SEO ("ai governance" keyword)
   - 1500 words, beginner-friendly

2. **"How to Implement Intent-Based Execution for AI Agents"**
   - Technical deep-dive
   - Code examples using Vienna OS SDK

3. **"Vienna OS vs. Manual Approval Workflows: A Comparison"**
   - Use case: financial services compliance
   - ROI calculation (time saved, risk reduction)

4. **"5 Real-World AI Governance Failures (And How to Prevent Them)"**
   - Case studies (Knight Capital, AWS outage, etc.)
   - Show how Vienna OS would have prevented each

5. **"Building AI Agents with Built-In Governance"**
   - Tutorial: integrate Vienna OS SDK into existing agent
   - Step-by-step with code snippets

**SEO Keywords:**
- ai governance
- ai agent safety
- intent-based execution
- ai risk management
- autonomous agent oversight

**Distribution:**
- Post on regulator.ai/blog
- Cross-post to Dev.to (item 11)
- Share on Twitter @Vienna_OS
- Submit to AI newsletters (TLDR AI, Superhuman)

**Priority:** High (drives organic traffic + positions as thought leader)

---

### Item 6: 3 More Compare Pages (Credo AI, Calypso AI, Holistic AI)
**Location:** `/apps/marketing/pages/compare/`  
**Existing:** `/compare/vanta` + `/compare/drata`  
**Aiden's scope:** Create 3 more comparison pages

**Structure (per page):**
1. **Hero:** "Vienna OS vs [Competitor]"
2. **Quick Comparison Table:**
   - Price
   - Use case (compliance vs. runtime governance)
   - Integration complexity
   - Enforcement model (pre-execution vs. post-execution)
3. **Feature Breakdown:**
   - Vienna OS: Intent Gateway, Policy Engine, Warrants, SSE
   - Competitor: Their approach
4. **When to Choose Each:**
   - Vienna OS: Real-time agent governance, execution control
   - Competitor: Compliance reporting, risk assessment
5. **CTA:** "Try Vienna OS Free" + "Book a Demo"

**Pages:**
1. `/compare/credo-ai` — Vienna OS vs. Credo AI
2. `/compare/calypso-ai` — Vienna OS vs. Calypso AI
3. `/compare/holistic-ai` — Vienna OS vs. Holistic AI

**Research:**
- Check competitor websites for positioning
- Highlight differentiation (runtime vs. reporting)
- Be factual, not dismissive

**Priority:** Medium (helps with SEO + competitive positioning)

---

### Item 9: Customer Portal UI (Frontend Integration)
**Vienna completed:** Backend endpoint (`POST /api/v1/billing/portal`)  
**Aiden's scope:** Add UI button in Settings page

**Action:**
1. Navigate to `/apps/console/src/pages/Settings.tsx`
2. Add "Manage Billing" button in "Subscription" section:

```tsx
const handleManageBilling = async () => {
  const res = await apiClient.post('/api/v1/billing/portal');
  window.open(res.url, '_blank');  // Opens Stripe portal in new tab
};

<button onClick={handleManageBilling} className="btn-secondary">
  Manage Billing
</button>
```

3. Add help text: "Update payment method, view invoices, cancel subscription"

**Priority:** Medium (nice-to-have for self-service)

---

### Item 11: HN + Dev.to + Reddit Launch Posts
**Aiden's scope:** Write + publish launch posts on 3 platforms

**Platform 1: Hacker News (Show HN)**
**Title:** "Show HN: Vienna OS – Execution control for autonomous AI agents"

**Body:**
```
Hi HN,

I built Vienna OS to solve a problem we faced when deploying AI agents:
how do you let agents act autonomously while maintaining control over
what they can do?

Vienna OS is an execution kernel that wraps agent actions in a
governance layer. Before an agent deploys code, deletes data, or
transfers money, it submits an "intent" through Vienna's policy engine.

The system evaluates the intent against your policies and either:
1. Issues a warrant (permission) for low-risk actions
2. Escalates to human approval for high-risk actions
3. Blocks prohibited actions

Key features:
- Intent-based execution (declarative, auditable)
- Policy engine (define rules for agent actions)
- Real-time approval workflow (SSE for instant updates)
- Multi-tenant (isolate agents by team/project)
- Open source (BSL 1.1, Apache 2.0 after 4 years)

Live demo: https://console.regulator.ai
Docs: https://regulator.ai/docs
GitHub: https://github.com/risk-ai/vienna-os

Would love feedback on the architecture and any suggestions for
governance policies you'd find useful.
```

**When to post:** Tuesday or Wednesday, 9-11 AM PT (peak HN traffic)

---

**Platform 2: Dev.to**
**Title:** "Building an Execution Kernel for AI Agents (Open Source)"

**Body:**
- Longer form (1500-2000 words)
- Technical deep-dive on architecture
- Code examples (SDK usage)
- Embed demo video
- Link to GitHub + docs
- Use tags: #ai #opensource #governance #agents

**When to post:** Anytime (Dev.to is less time-sensitive)

---

**Platform 3: Reddit**
**Subreddits:**
- /r/MachineLearning (allow self-promotion on Saturdays)
- /r/ArtificialIntelligence
- /r/SideProject
- /r/OpenSourceProjects

**Title:** "[P] Vienna OS – Open-source execution control for AI agents"

**Body:**
- Shorter than HN (400-600 words)
- Focus on problem/solution
- Link to live demo + GitHub
- Mention "feedback welcome"
- Be genuine, not salesy

**When to post:** Saturday for /r/MachineLearning, anytime for others

---

**Priority:** High (drives initial traffic + community feedback)

---

## Summary

**Vienna's work (complete):** 7/11 items  
**Aiden's work (remaining):** 4/11 items

**Aiden's prioritized task list:**
1. **High:** Item 11 (HN/Dev.to/Reddit posts) — launch announcement
2. **High:** Item 3 (Welcome email drip) — improves activation
3. **High:** Item 5 (5+ blog posts) — SEO + thought leadership
4. **Medium:** Item 6 (3 compare pages) — competitive positioning
5. **Medium:** Item 9 (Customer portal UI) — self-service billing
6. **Low:** Item 2 (CONTRIBUTING.md community section) — nice-to-have

**Estimated time:**
- Item 11: 4 hours (write + post)
- Item 3: 6 hours (copy + implementation)
- Item 5: 12 hours (5 posts @ ~2.5 hours each)
- Item 6: 6 hours (3 pages @ ~2 hours each)
- Item 9: 1 hour (simple UI integration)
- Item 2: 2 hours (polish + expand)

**Total:** ~31 hours → Target ~92% completion → 97% with items 3, 5, 11 (22 hours)

---

## Coordination Notes

- Vienna has completed all backend/infrastructure work
- No blockers for Aiden's tasks
- Content can be written and published independently
- For technical questions: ping Vienna in Slack
- For content review: share draft before publishing
- Track progress in #agent-coordination

---

**Next check-in:** After Item 11 (launch posts) to assess traffic + feedback
