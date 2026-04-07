# Pages Dependency Trees

Complete component dependency mapping for key pages.

---

## Homepage (`/`)
**File:** `src/app/page.tsx`
**Type:** Client Component
**Routing:** Next.js 16 app router

### Imports
```tsx
import { Shield, FileText, CheckCircle, ArrowRight, Zap, Activity, Users, Lock, Code2 } from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
```

### Component Tree
```
Home
├── SiteNav (sticky navigation)
│   ├── Link (Next.js)
│   ├── Shield icon (lucide-react)
│   ├── Mobile menu toggle (useState)
│   └── CTA button (purple gradient)
├── Hero Section
│   ├── Warrant card (terminal-style)
│   │   ├── FileText icon
│   │   ├── CheckCircle icon
│   │   └── Metadata display (grid)
│   ├── Features grid
│   │   ├── Shield icon
│   │   ├── Lock icon
│   │   ├── Activity icon
│   │   ├── Users icon
│   │   └── Code2 icon
│   ├── CTA buttons
│   │   ├── "GENERATE_WARRANT" (amber)
│   │   └── "VIEW_SPEC" (outline)
│   └── Stats display (3 columns)
├── Features Sections
│   ├── 6-column grid
│   ├── Icon badges
│   ├── Descriptions
│   └── "Learn more" links
├── Comparison Section
│   ├── Competitor comparison matrix
│   └── Callout to /compare
├── Risk Tiers Section
│   ├── T0-T3 tier display
│   ├── Examples per tier
│   └── Color-coded badges
├── Integrations Preview
│   ├── 6-item grid
│   └── Links to /integrations
├── CTA Section
│   └── Large gradient button
└── SiteFooter (sticky)
    └── Link grid (Product, Company, Compare, Legal)
```

### Key State Management
- `currentTime` - UTC timestamp (updated every second)
- Used for "LIVE" indicator

### Analytics Events
- `analytics.page("Homepage")` on mount

### Responsive Behavior
- Grid switches to single column on `md` breakpoint
- Mobile menu toggle for navigation
- Terminal card centered on mobile, right column on desktop

---

## Pricing Page (`/pricing`)
**File:** `src/app/pricing/page.tsx`
**Type:** Client Component

### Imports
```tsx
import { Check, X, Zap, Building2, Shield, Rocket, Star, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import FloatingContact from "@/components/FloatingContact";
```

### Component Tree
```
PricingPage
├── Header
│   └── "Back" link
├── Hero Section
│   ├── Badge
│   ├── Heading
│   └── Description
├── Pricing Tiers Grid
│   ├── Community Tier (Free)
│   │   ├── Icon (Rocket)
│   │   ├── Price display
│   │   ├── Features list with Check/X icons
│   │   └── CTA button
│   ├── Pro Tier (pricing)
│   │   └── (same structure)
│   ├── Enterprise Tier (custom)
│   │   └── (same structure)
│   └── Payment toggle (annual/monthly)
├── FAQ Accordion
│   └── Collapsible items
├── Comparison Table
│   ├── Feature rows
│   └── Tier columns
├── LeadCaptureModal (trigger: pricing page view)
│   └── Email capture form
├── FloatingContact
│   └── Support widget (bottom-right)
└── SiteFooter
```

### State Management
```tsx
const [modalOpen, setModalOpen] = useState(false);
const [billingPeriod, setBillingPeriod] = useState("monthly");
const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
```

### Key Features
- Tier cards with icons (lucide-react)
- Check/X icons for feature inclusion
- Modal trigger on CTA click
- Floating contact widget
- Annual/monthly toggle

---

## Docs Page (`/docs`)
**File:** `src/app/docs/page.tsx`
**Type:** Client Component (very large, 3000+ lines)

### Component Tree
```
DocsPage
├── Left Sidebar (sticky)
│   ├── Search input
│   ├── Navigation sections
│   │   ├── Quickstart (5 min)
│   │   ├── Getting Started
│   │   ├── API Reference
│   │   ├── Integration Guide
│   │   ├── GitHub Action
│   │   └── Troubleshooting
│   └── Section collapsible toggle
├── Main Content Area
│   ├── Heading
│   ├── Code examples (syntax highlighted)
│   ├── Terminal blocks
│   ├── Command reference
│   ├── API endpoint docs
│   ├── Parameter tables
│   └── Copy buttons on code blocks
├── Mobile Menu Toggle
│   └── Hamburger for sidebar
├── Mobile Sidebar
│   └── Responsive nav
└── Analytics tracking
```

### Key Features
- Interactive navigation
- Code syntax highlighting
- Copy-to-clipboard for code blocks
- Terminal output formatting
- API reference tables
- Search/filter capability
- Responsive sidebar (sticky on desktop)

### Icons Used
- Terminal, BookOpen, Zap, Lock, Server, Code, Database, Key, Globe, Settings, Users, Activity, CheckCircle, Search

---

## SDK Page (`/sdk`)
**File:** `src/app/sdk/page.tsx`
**Type:** Client Component

### Component Tree
```
SDKPage
├── Header
│   └── "Back to Home" link
├── Hero Section
│   ├── Badge
│   ├── Heading
│   ├── Description
│   └── CTA buttons (GitHub, Docs)
├── Installation Section
│   ├── JavaScript/TypeScript
│   │   ├── Package icon
│   │   ├── npm install command
│   │   └── Installation notes
│   ├── Python
│   │   └── (same structure)
│   └── Go
│       └── (same structure)
├── Quick Example Section
│   ├── Code blocks
│   ├── Copy buttons
│   └── Output examples
├── API Reference
│   ├── Method signatures
│   ├── Parameters
│   ├── Return types
│   └── Examples
├── Integration Guides
│   ├── LangChain example
│   ├── CrewAI example
│   └── Custom agent example
└── SiteFooter
```

### Key Features
- Language-specific installation
- Copy-to-clipboard code blocks
- Interactive examples
- API reference tables
- Multi-language support (JS/TS, Python, Go)

---

## Blog Index Page (`/blog`)
**File:** `src/app/blog/page.tsx`
**Type:** Client Component

### Component Tree
```
BlogPage
├── Header
│   └── Navigation breadcrumbs
├── Hero Section
│   ├── Heading
│   └── Description
├── Featured Article
│   ├── Large card
│   ├── Title
│   ├── Excerpt
│   ├── Author, date, read time
│   └── Category badge
├── Article Grid
│   ├── Post 1
│   │   ├── Title
│   │   ├── Excerpt
│   │   ├── Meta (date, read time, category)
│   │   └── Link to /blog/[slug]
│   ├── Post 2-N
│   │   └── (same structure)
│   └── Responsive: 1 col mobile, 2-3 cols desktop
├── Pagination (if many posts)
│   └── Next/Previous buttons
└── SiteFooter
```

### Dynamic Routes
- `/blog/[slug]` - Article pages with full content
- Blog metadata from frontmatter

### Key Features
- Category badges (color-coded)
- Reading time estimates
- Author attribution
- Publish date
- Excerpt truncation
- Responsive grid

---

## Blog Article Page (`/blog/[slug]`)
**File:** `src/app/blog/[slug]/page.tsx`
**Type:** Client Component (dynamic)

### Component Tree
```
BlogArticle
├── ReadingProgressBar (fixed top)
├── Header
├── Meta Section
│   ├── Publish date
│   ├── Author
│   ├── Reading time
│   └── Category badge
├── Article Content
│   ├── Markdown-rendered HTML
│   ├── Code blocks with syntax highlighting
│   ├── Blockquotes
│   ├── Images
│   ├── Links to other posts/pages
│   └── Callout boxes
├── BlogCTA
│   ├── "Read more" or "Get started" button
│   └── Related articles
├── BlogTracker
│   └── Analytics tracking (scroll depth, engagement)
└── SiteFooter
```

### Sub-Components
- **BlogCTA.tsx** - Article bottom CTA
- **BlogTracker.tsx** - Analytics for engagement

### Key Features
- Reading progress bar
- Scroll-depth tracking
- Related articles suggestion
- Social sharing buttons (implicit)
- Code syntax highlighting
- Internal link routing

---

## Docs Index Layout
**Path:** `src/app/docs/layout.tsx`

### Component Tree
```
DocsLayout
├── Header (sticky)
├── Sidebar (sticky on desktop, collapsible on mobile)
│   ├── Search
│   ├── Navigation sections
│   └── Active section highlight
└── Main content area
```

### Shared with other sections
- Same docs navigation structure
- Sticky sidebar for quick navigation
- Search capability

---

## Key Page Patterns

### Hero Sections
All pages follow pattern:
```tsx
<section className="pt-20 pb-32 px-6">
  <div className="max-w-7xl mx-auto">
    <Badge />
    <h1>Title</h1>
    <p>Description</p>
    <div className="flex gap-4">
      <CTA />
    </div>
  </div>
</section>
```

### Grid Layouts
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id}>
      <Icon />
      <h3>{item.title}</h3>
      <p>{item.desc}</p>
    </Card>
  ))}
</div>
```

### Form Modals
- LeadCaptureModal on key actions
- Triggered by CTA clicks
- Analytics tracking

### Floating Elements
- ReadingProgressBar (fixed top)
- FloatingContact (fixed bottom-right)
- Newsletter signup (embedded or modal)

---

## Data Flow

### Analytics Pipeline
```
useEffect(() => analytics.page("PageName"), [])
↓
Button click → analytics.ctaClick(section, action)
↓
Form submit → analytics.leadCaptureSubmit(email, interest)
↓
Scroll event → analytics tracking (read time, depth)
```

### Local Storage
- Lead capture data cached in localStorage
- Newsletter preferences
- User preferences (dark mode, etc.)

---

## Responsive Patterns

### Mobile-First
- Single column by default
- Stack on mobile (no grid)
- Hidden desktop elements (`hidden md:flex`)
- Mobile menu for navigation

### Desktop
- Multi-column grids
- Sticky sidebars
- Floating widgets
- Full navigation bar

### Breakpoints Used
- `md`: 768px - tablet/desktop switch
- `lg`: 1024px - larger desktop layouts
- `xl`: 1280px - wide desktop

---

## Performance Optimizations

### Code Splitting
- Next.js automatic code splitting per page
- Dynamic imports for heavy components
- Lazy loading for images

### Analytics
- Client-side tracking
- Page view events
- Scroll depth tracking
- Conversion tracking

### Caching
- localStorage for lead data
- Client-side state management (useState)
- No heavy server-side rendering (mostly client components)

---

## Key Integration Points

### External Services
- **Stripe**: `/api/checkout` endpoint
- **Newsletter**: `/api/newsletter` endpoint
- **Forms**: `/api/contact`, `/api/signup`
- **Analytics**: GA4 configured globally

### Internal Linking
- Next.js `Link` for all internal navigation
- Relative imports for components (`@/components`)
- Clean URL patterns for discoverability

---

## Search & Discovery

### SEO Elements
- Metadata in `layout.tsx` root
- Open Graph images for social sharing
- JSON-LD structured data (SoftwareApplication)
- Robots.txt and sitemap.ts

### Analytics
- Page view tracking
- CTA click tracking
- Lead capture tracking
- Scroll depth on articles
- Time on page

---

## Error Handling

### Error Boundaries
- `src/app/error.tsx` - Page-level
- `src/app/global-error.tsx` - Global

### 404 Handling
- `src/app/not-found.tsx` - Custom 404

### Form Errors
- LeadCaptureModal shows error messages
- Newsletter form displays error state
- Contact form validation feedback
