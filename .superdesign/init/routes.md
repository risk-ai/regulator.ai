# Routes Map

## Next.js 16 App Router Structure

All routes are defined in `src/app/` directory.

---

## Public Routes

### Static Pages

| Route | File | Type | Purpose |
|-------|------|------|---------|
| `/` | `src/app/page.tsx` | Page | Homepage hero + features |
| `/docs` | `src/app/docs/page.tsx` | Page | Documentation hub (interactive) |
| `/docs/quickstart` | `src/app/docs/getting-started/page.tsx` | Page | 5-min quickstart |
| `/docs/api-reference` | `src/app/docs/api-reference/page.tsx` | Page | API endpoints docs |
| `/docs/integration-guide` | `src/app/docs/integration-guide/page.tsx` | Page | Integration guide |
| `/docs/github-action` | `src/app/docs/github-action/page.tsx` | Page | GitHub Actions integration |
| `/pricing` | `src/app/pricing/page.tsx` | Page | Pricing tiers (Community/Pro/Enterprise) |
| `/compare` | `src/app/compare/page.tsx` | Page | AI governance comparison matrix |
| `/compare/guardrails-ai` | `src/app/compare/guardrails-ai/page.tsx` | Page | vs Guardrails AI |
| `/compare/arthur-ai` | `src/app/compare/arthur-ai/page.tsx` | Page | vs Arthur AI |
| `/compare/credo-ai` | `src/app/compare/credo-ai/page.tsx` | Page | vs Credo AI |
| `/compare/calypso-ai` | `src/app/compare/calypso-ai/page.tsx` | Page | vs Calypso AI |
| `/compare/holistic-ai` | `src/app/compare/holistic-ai/page.tsx` | Page | vs Holistic AI |
| `/enterprise` | `src/app/enterprise/page.tsx` | Page | Enterprise features |
| `/try` | `src/app/try/page.tsx` | Page | Try now / trial signup |
| `/sdk` | `src/app/sdk/page.tsx` | Page | SDK documentation |
| `/blog` | `src/app/blog/page.tsx` | Page | Blog index |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | Page | Dynamic blog articles |
| `/case-studies` | `src/app/case-studies/page.tsx` | Page | Case studies index |
| `/contact` | `src/app/contact/page.tsx` | Page | Contact form |
| `/demo` | `src/app/demo/page.tsx` | Page | Live demo |
| `/demo/warrant` | `src/app/demo/warrant/page.tsx` | Page | Warrant demo |
| `/integrations` | `src/app/integrations/page.tsx` | Page | Integrations index |
| `/about` | `src/app/about/page.tsx` | Page | About company |
| `/faq` | `src/app/faq/page.tsx` | Page | FAQ page |
| `/glossary` | `src/app/glossary/page.tsx` | Page | Terminology glossary |
| `/use-cases` | `src/app/use-cases/page.tsx` | Page | Use cases |
| `/execution` | `src/app/execution/page.tsx` | Page | Execution control features |
| `/examples` | `src/app/examples/page.tsx` | Page | Code examples |
| `/security` | `src/app/security/page.tsx` | Page | Security page |
| `/privacy` | `src/app/privacy/page.tsx` | Page | Privacy policy |
| `/terms` | `src/app/terms/page.tsx` | Page | Terms of service |
| `/manifest` | `src/app/manifesto/page.tsx` | Page | Vienna OS manifesto |
| `/changelog` | `src/app/changelog/page.tsx` | Page | Version changelog |
| `/community` | `src/app/community/page.tsx` | Page | Community page |
| `/status` | `src/app/status/page.tsx` | Page | Status page |
| `/roi` | `src/app/roi/page.tsx` | Page | ROI calculator |

---

## Authentication Routes

| Route | File | Type | Purpose |
|-------|------|------|---------|
| `/signup` | `src/app/signup/page.tsx` | Page | User signup form |
| `/signup/success` | `src/app/signup/success/page.tsx` | Page | Signup confirmation |
| `/register` | `src/app/register/page.tsx` | Page | Registration page |

---

## API Routes (Next.js API)

| Route | File | Type | Purpose |
|-------|------|------|---------|
| `/api/newsletter` | `src/app/api/newsletter/route.ts` | POST | Subscribe to newsletter |
| `/api/signup` | `src/app/api/signup/route.ts` | POST | Sign up user |
| `/api/contact` | `src/app/api/contact/route.ts` | POST | Contact form submission |
| `/api/try` | `src/app/api/try/route.ts` | POST | Start trial |
| `/api/checkout` | `src/app/api/checkout/route.ts` | POST | Stripe checkout |
| `/api/webhooks/stripe` | `src/app/api/webhooks/stripe/route.ts` | POST | Stripe webhook |
| `/api/email/send-followup` | `src/app/api/email/send-followup/route.ts` | POST | Send follow-up email |
| `/api/email/drip/day3` | `src/app/api/email/drip/day3/route.ts` | POST | Day 3 drip email |
| `/api/email/drip/day7` | `src/app/api/email/drip/day7/route.ts` | POST | Day 7 drip email |
| `/api/email/digest` | `src/app/api/email/digest/route.ts` | POST | Send digest email |
| `/api/status` | `src/app/api/status/route.ts` | GET | System status check |

---

## Admin Routes

| Route | File | Type | Purpose |
|-------|------|------|---------|
| `/admin` | `src/app/admin/page.tsx` | Page | Admin dashboard |

---

## Special Routes

| Route | File | Type | Purpose |
|-------|------|------|---------|
| `/robots.ts` | `src/app/robots.ts` | Metadata | SEO robots config |
| `/sitemap.ts` | `src/app/sitemap.ts` | Metadata | XML sitemap |
| `/opengraph-image.tsx` | `src/app/opengraph-image.tsx` | Image | OG image |
| `/error.tsx` | `src/app/error.tsx` | Error | Error boundary |
| `/not-found.tsx` | `src/app/not-found.tsx` | Not Found | 404 page |
| `/global-error.tsx` | `src/app/global-error.tsx` | Error | Global error handler |

---

## Directory Structure

```
src/app/
├── layout.tsx                 # Root layout (metadata, fonts, GA4)
├── page.tsx                   # Homepage
├── globals.css                # Global styles + animations
├── error.tsx                  # Error boundary
├── global-error.tsx           # Global error handler
├── not-found.tsx              # 404 page
├── robots.ts                  # SEO robots config
├── sitemap.ts                 # XML sitemap
├── opengraph-image.tsx        # OG image generator
│
├── about/
│   ├── layout.tsx
│   └── page.tsx
│
├── admin/
│   └── page.tsx
│
├── api/
│   ├── checkout/route.ts
│   ├── contact/route.ts
│   ├── email/
│   │   ├── digest/route.ts
│   │   ├── drip/
│   │   │   ├── day3/route.ts
│   │   │   └── day7/route.ts
│   │   └── send-followup/route.ts
│   ├── newsletter/route.ts
│   ├── signup/route.ts
│   ├── status/route.ts
│   ├── try/route.ts
│   └── webhooks/
│       └── stripe/route.ts
│
├── blog/
│   ├── layout.tsx
│   ├── page.tsx               # Blog index
│   └── [slug]/
│       ├── page.tsx           # Dynamic article
│       ├── BlogCTA.tsx
│       └── BlogTracker.tsx
│
├── case-studies/
│   ├── layout.tsx
│   └── page.tsx
│
├── changelog/
│   └── page.tsx
│
├── community/
│   └── page.tsx
│
├── compare/
│   ├── layout.tsx
│   ├── page.tsx               # Comparison matrix
│   ├── arthur-ai/page.tsx
│   ├── calypso-ai/page.tsx
│   ├── credo-ai/page.tsx
│   ├── guardrails-ai/page.tsx
│   └── holistic-ai/page.tsx
│
├── contact/
│   ├── layout.tsx
│   └── page.tsx
│
├── demo/
│   ├── layout.tsx
│   ├── page.tsx
│   └── warrant/page.tsx
│
├── docs/
│   ├── layout.tsx
│   ├── page.tsx               # Docs index (interactive)
│   ├── api-reference/page.tsx
│   ├── getting-started/page.tsx
│   ├── github-action/page.tsx
│   └── integration-guide/page.tsx
│
├── enterprise/
│   ├── layout.tsx
│   └── page.tsx
│
├── examples/
│   └── page.tsx
│
├── execution/
│   └── page.tsx
│
├── faq/
│   └── page.tsx
│
├── fonts/
│   └── [fonts...]
│
├── glossary/
│   └── page.tsx
│
├── integrations/
│   ├── layout.tsx
│   └── page.tsx
│
├── manifesto/
│   └── page.tsx
│
├── pricing/
│   ├── layout.tsx
│   └── page.tsx
│
├── privacy/
│   └── page.tsx
│
├── register/
│   └── page.tsx
│
├── roi/
│   ├── layout.tsx
│   └── page.tsx
│
├── sdk/
│   └── page.tsx
│
├── security/
│   └── page.tsx
│
├── signup/
│   ├── layout.tsx
│   ├── page.tsx
│   └── success/page.tsx
│
├── status/
│   ├── layout.tsx
│   └── page.tsx
│
├── terms/
│   └── page.tsx
│
├── try/
│   ├── layout.tsx
│   └── page.tsx
│
└── use-cases/
    └── page.tsx
```

---

## Route Conventions

### Page Naming
- `page.tsx` - Content page
- `layout.tsx` - Layout wrapper
- `route.ts` - API endpoint
- `[param]` - Dynamic segment

### Special Files
- `error.tsx` - Error boundary
- `not-found.tsx` - 404 handler
- `loading.tsx` - Loading UI (if used)
- `robots.ts` - SEO metadata
- `sitemap.ts` - XML sitemap

### Metadata
- All metadata defined in `src/app/layout.tsx`
- Uses Next.js Metadata API
- Supports Open Graph, Twitter cards, JSON-LD

---

## Route Patterns

### Public Content Routes
All start with `/` and are publicly accessible.

### API Routes
All start with `/api/` and follow RESTful patterns:
- POST for form submissions
- GET for status checks
- WebHooks for external services

### Dynamic Routes
`[slug]` pattern used for:
- Blog articles: `/blog/[slug]`
- Comparison pages: (nested dynamic params)

---

## External Links

Routes that redirect to external services:
- GitHub: `https://github.com/risk-ai/vienna-os`
- Console: `https://console.regulator.ai`
- Sign In: `https://console.regulator.ai`
- Sign Up: `https://console.regulator.ai/signup`
- Trials: `https://github.com/risk-ai/regulator.ai`

---

## Segment Configuration

### Root
- English language only (`lang="en"`)
- Dark mode enabled (`className="dark"`)

### Nested Layouts
- Some sections have own `layout.tsx` for section-specific wrappers
- Example: `/pricing`, `/docs`, `/blog` have own layouts for specialized navigation

---

## SEO & Metadata

All pages inherit from root metadata with template:
```
{title} | Vienna OS
```

Special handling:
- Blog posts: Dynamic titles from frontmatter
- Product pages: Custom OG images
- API pages: Structured data for integration guides
