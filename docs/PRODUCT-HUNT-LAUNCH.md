# Product Hunt Launch Plan — Vienna OS

## Listing Details

**Name:** Vienna OS

**Tagline** (60 chars):
> The governance layer AI agents answer to

**Description** (260 chars):
> Vienna OS is an open-source execution control plane for AI agents. Every action gets policy evaluation, risk tiering, cryptographic warrants, and immutable audit trails. Works with LangChain, CrewAI, AutoGen & more. Free tier, BSL 1.1.

**Topics:** AI, Developer Tools, Open Source, SaaS, Compliance, DevOps

**Website:** https://regulator.ai
**GitHub:** https://github.com/risk-ai/regulator.ai

---

## Maker Comment (first comment)

> Hey Product Hunt! 👋
>
> I'm Max, a 3L at Cornell Law building at the intersection of legal tech and AI systems.
>
> Here's the problem: AI agents are increasingly autonomous — deploying code, moving money, updating patient records. But the frameworks that build these agents (LangChain, CrewAI, AutoGen) don't answer a fundamental question: **who approved this action, and can you prove it to an auditor?**
>
> Vienna OS is the governance layer that fills this gap. It sits between agent intent and execution. Every action gets:
> - A **risk tier** (T0 auto-approve → T3 multi-party)
> - A **policy check** against your rules
> - A **cryptographic warrant** — signed, scoped, time-limited
> - An **immutable audit entry**
>
> No warrant, no execution. It's that simple.
>
> We built this because compliance teams at banks, hospitals, and law firms told us: "We want to use AI agents, but we can't prove governance to our regulators."
>
> Vienna OS is open source (BSL 1.1), free to start with 5 agents, and integrates in 5 lines of code. Try it live at regulator.ai/try.
>
> Would love your feedback! 🙏

---

## Gallery Images

Use screenshots from `docs/screenshots/`:

1. **01-hero.png** — Landing page hero with warrant card
2. **02-try-playground.png** — Interactive /try playground
3. **03-pricing.png** — Pricing tiers
4. **04-demo.png** — Cinematic demo page
5. **05-docs.png** — Documentation

Additional recommended:
- Pipeline diagram (can extract from landing page)
- Warrant specimen close-up
- Code integration example (5 lines)

---

## Launch Day Checklist

### Pre-Launch (Day Before)
- [ ] Schedule PH listing for 12:01 AM PT
- [ ] Prepare maker comment (above)
- [ ] Test all links (regulator.ai, /try, /demo, /docs, /signup, console.regulator.ai)
- [ ] Verify npm package: `npm install @vienna-os/sdk`
- [ ] Stage social media posts

### Launch Day
- [ ] Post maker comment within 5 min of launch
- [ ] **Twitter/X:** Post launch thread (see LAUNCH-TWITTER-THREAD.md)
- [ ] **Hacker News:** Submit "Show HN: Vienna OS — Open-source governance for AI agents"
  - Link: https://regulator.ai
  - Comment with technical details + GitHub link
- [ ] **Reddit:**
  - r/artificial — "We built an open-source governance layer for AI agents"
  - r/programming — "Show r/programming: Execution warrants for AI agents (BSL 1.1)"
  - r/MachineLearning — "Vienna OS: Policy enforcement + cryptographic warrants for autonomous agents"
  - r/devops — "Governance control plane for AI-assisted deployments"
- [ ] **LinkedIn:** Announce post from Max Anderson + ai.ventures page
- [ ] **Discord:** Post in AI/dev communities

### Post-Launch (24-48h)
- [ ] Respond to every PH comment
- [ ] Monitor HN comments, respond to technical questions
- [ ] Track signups + GitHub stars
- [ ] Share milestone updates ("Top 5 Product of the Day" etc.)
- [ ] Follow up with anyone who expressed interest

---

## Success Metrics

| Metric | Target |
|---|---|
| Product Hunt upvotes | 200+ (Top 5 of the day) |
| GitHub stars (day 1) | 100+ |
| npm installs (week 1) | 500+ |
| Signups (week 1) | 50+ |
| HN points | 100+ |
