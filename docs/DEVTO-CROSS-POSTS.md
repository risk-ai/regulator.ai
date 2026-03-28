# Dev.to / Hashnode Cross-Posting Guide

Cross-post blog articles to Dev.to and Hashnode with canonical URLs pointing back to regulator.ai. This gives us:
- Free backlinks (SEO)
- Developer audience exposure
- Content syndication without duplicate content penalty

## Setup

### Dev.to
1. Create account at dev.to
2. Go to Settings → Extensions → Publishing from RSS (or use API)
3. For each post, set canonical URL to `https://regulator.ai/blog/[slug]`

### Hashnode
1. Create blog at hashnode.dev
2. Import articles with canonical URL setting
3. Map to custom domain later if desired

## Posts to Cross-Post (in order)

### 1. "5 AI Agent Disasters That Could Have Been Prevented"
**Dev.to tags:** `ai`, `security`, `devops`, `programming`
**Canonical:** `https://regulator.ai/blog/ai-agent-disasters-prevented`
**Hook:** Most engaging, story-driven, highest share potential
**Priority:** 🔴 Post first

### 2. "Vienna OS vs Guardrails AI"
**Dev.to tags:** `ai`, `opensource`, `security`, `comparison`
**Canonical:** `https://regulator.ai/blog/vienna-os-vs-guardrails-ai`
**Hook:** Comparison posts rank well and attract framework users
**Priority:** 🔴 Post second

### 3. "Governing LangChain Agents in Production"
**Dev.to tags:** `python`, `ai`, `langchain`, `tutorial`
**Canonical:** `https://regulator.ai/blog/governing-langchain-agents`
**Hook:** LangChain has a huge Dev.to audience
**Priority:** 🟡

### 4. "How Execution Warrants Work"
**Dev.to tags:** `ai`, `security`, `architecture`, `tutorial`
**Canonical:** `https://regulator.ai/blog/how-execution-warrants-work`
**Hook:** Deep technical content, attracts senior engineers
**Priority:** 🟡

### 5. "HIPAA Compliance for AI Agents"
**Dev.to tags:** `ai`, `healthcare`, `compliance`, `security`
**Canonical:** `https://regulator.ai/blog/hipaa-compliance-ai-agents`
**Hook:** Niche but high-intent healthcare/compliance audience
**Priority:** 🟢

### 6. "Why AI Agents Need a Governance Layer"
**Dev.to tags:** `ai`, `devops`, `security`, `beginners`
**Canonical:** `https://regulator.ai/blog/why-ai-agents-need-governance`
**Hook:** Broad appeal, good for newcomers
**Priority:** 🟢

## Cross-Post Template

When publishing on Dev.to, add this at the top:

```
---
title: [TITLE]
published: true
tags: [tag1, tag2, tag3, tag4]
canonical_url: https://regulator.ai/blog/[SLUG]
cover_image: https://regulator.ai/og-image.png
---
```

And add this at the bottom of each post:

```markdown
---

*Originally published at [regulator.ai](https://regulator.ai/blog/[SLUG]). Vienna OS is the execution control layer for autonomous AI systems — cryptographic warrants, risk tiering, and immutable audit trails. [Try it free](https://regulator.ai/signup).*
```

## Posting Schedule

| Day | Platform | Post |
|---|---|---|
| Launch Day | Dev.to | "5 AI Agent Disasters" |
| Launch Day | Hashnode | "5 AI Agent Disasters" |
| Launch +2 | Dev.to | "Vienna OS vs Guardrails AI" |
| Launch +4 | Dev.to | "Governing LangChain Agents" |
| Launch +7 | Dev.to | "How Execution Warrants Work" |
| Launch +10 | Dev.to | "HIPAA Compliance for AI Agents" |
| Launch +14 | Dev.to | "Why AI Agents Need Governance" |

Space them 2-3 days apart to avoid Dev.to rate limits and maintain visibility in the feed.
