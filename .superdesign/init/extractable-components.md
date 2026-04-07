# Extractable Components for SuperDesign

This document identifies reusable layout and UI components that can be extracted and managed as SuperDesign components.

---

## Priority 1: Layout Components (High Reusability)

### NavBar / SiteNav
**Source Path:** `src/components/SiteNav.tsx`
**Type:** Client Component
**Reuse Count:** All pages (global header)
**Status:** Ready for extraction

**Key Props:**
- None (hardcoded links)

**Customization Points:**
- Navigation links (make configurable)
- Logo text (currently "ViennaOS")
- Mobile breakpoint (currently `md`)
- CTA button (currently "Start Free Trial")

**Variants Needed:**
- Desktop only (hide mobile menu)
- Mobile only (for demo)
- Custom link sets (for different sections)
- Alternative logo/branding

**Dependencies:**
- Next.js Link
- Lucide icons (Shield icon)
- Tailwind CSS

**Extraction Strategy:**
```tsx
interface NavBarProps {
  links?: NavLink[];
  logo?: string;
  ctaText?: string;
  ctaHref?: string;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'transparent';
}

type NavLink = {
  label: string;
  href: string;
  external?: boolean;
};
```

---

### Footer / SiteFooter
**Source Path:** `src/components/SiteFooter.tsx`
**Type:** Server Component
**Reuse Count:** All pages (global footer)
**Status:** Ready for extraction

**Key Props:**
- None (hardcoded links and content)

**Customization Points:**
- Footer columns (Product, Company, Compare, Legal)
- Links in each column
- Copyright year (currently 2026)
- License text (currently "BSL 1.1")
- Social links

**Variants Needed:**
- Full footer (current)
- Compact footer (minimal links)
- Dark footer variant
- Light footer variant (if light mode added)

**Dependencies:**
- Next.js Link
- Lucide icons (Shield icon)
- Tailwind CSS

**Extraction Strategy:**
```tsx
interface FooterSection {
  title: string;
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
  }>;
}

interface FooterProps {
  sections?: FooterSection[];
  copyrightText?: string;
  companyName?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  variant?: 'default' | 'compact' | 'minimal';
}
```

---

## Priority 2: Form Components (Moderate Reusability)

### NewsletterSignup
**Source Path:** `src/components/NewsletterSignup.tsx`
**Type:** Client Component
**Reuse Count:** 2-3 pages
**Status:** Ready for extraction

**Key Props:**
- `className` - Custom CSS classes
- `variant` - "default" | "compact"
- `showSocialProof` - Toggle social proof display

**Customization Points:**
- Heading text
- Description text
- Button text
- Social proof message
- API endpoint (currently `/api/newsletter`)
- Form field labels
- Success message

**Variants Needed:**
- Default (large card with description)
- Compact (inline form)
- Modal variant (full-screen)
- Sidebar variant

**Dependencies:**
- Lucide icons (Mail, Users, Check)
- React hooks (useState)
- Tailwind CSS
- API endpoint `/api/newsletter`

**Extraction Strategy:**
```tsx
interface NewsletterSignupProps {
  className?: string;
  variant?: "default" | "compact" | "modal" | "sidebar";
  showSocialProof?: boolean;
  headingText?: string;
  descriptionText?: string;
  buttonText?: string;
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
  endpoint?: string;
}
```

---

### LeadCaptureModal
**Source Path:** `src/components/LeadCaptureModal.tsx`
**Type:** Client Component
**Reuse Count:** Multiple pages
**Status:** Ready for extraction

**Key Props:**
- `isOpen` - Modal visibility
- `onClose` - Close handler
- `trigger` - Trigger source (for analytics)
- `plan` - Optional plan name for context

**Customization Points:**
- Heading text
- Description text
- Form fields (email, interest)
- Button text
- Success message
- API endpoint
- Analytics tracking

**Variants Needed:**
- Default (email + textarea)
- Quick (email only)
- Plan-specific (show plan in heading)
- Multi-step (if needed)

**Dependencies:**
- Lucide icons (X, Zap, ArrowRight)
- React hooks (useState, useEffect)
- Tailwind CSS
- Analytics integration

**Extraction Strategy:**
```tsx
interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: string;
  plan?: string;
  headingText?: string;
  descriptionText?: string;
  fields?: FormField[];
  onSuccess?: (data: LeadData) => void;
  onError?: (error: string) => void;
}

type FormField = {
  name: string;
  label: string;
  type: 'email' | 'text' | 'textarea';
  placeholder?: string;
  required?: boolean;
};
```

---

## Priority 3: UI Components (Lower Reusability)

### FloatingContact
**Source Path:** `src/components/FloatingContact.tsx`
**Type:** Client Component
**Reuse Count:** 1-2 pages
**Status:** Partial extraction readiness

**Key Props:**
- None (hardcoded actions)

**Customization Points:**
- Position (currently bottom-right)
- Button icon
- Menu items
- Text content
- Colors
- Animation style

**Variants Needed:**
- Floating action (current)
- Embedded widget
- Sticky button (no expansion)
- Mobile only variant

**Dependencies:**
- Lucide icons (MessageCircle, X, Mail, Phone)
- React hooks (useState)
- Tailwind CSS
- Analytics

---

### ReadingProgressBar
**Source Path:** `src/components/ReadingProgressBar.tsx`
**Type:** Client Component
**Reuse Count:** Article pages only
**Status:** Low priority extraction

**Key Props:**
- None (no props, pure hook-based)

**Customization Points:**
- Position (top/bottom)
- Height
- Color gradient
- Animation speed
- Visibility conditions

**Variants Needed:**
- Top bar (current)
- Bottom bar
- Circular progress (for pages)
- Multiple track (for sections)

---

## Extraction Roadmap

### Phase 1: High-Priority (Do First)
1. **SiteNav** - Used everywhere, high customization need
2. **SiteFooter** - Used everywhere, flexible link structure
3. **NewsletterSignup** - Reused, clear variants

### Phase 2: Medium-Priority (After Phase 1)
1. **LeadCaptureModal** - Multiple triggers, clear data flow
2. **FloatingContact** - Reusable widget pattern

### Phase 3: Low-Priority (Polish)
1. **ReadingProgressBar** - Article-specific, less reuse

---

## SuperDesign Component Specifications

### NavBar Component
```
SuperDesign ID: navbar-site
Framework: React 19 + Next.js 16 + Tailwind CSS
Props: NavBarProps (see above)
CSS: Inline Tailwind classes
State: Local (mobileMenuOpen)
Accessibility: ARIA labels, semantic HTML
Mobile: Responsive toggle menu
Dark Mode: Built-in (zinc/violet/amber)
```

### Footer Component
```
SuperDesign ID: footer-site
Framework: React 19 + Next.js 16 + Tailwind CSS
Props: FooterProps (see above)
CSS: Inline Tailwind classes
State: None (static)
Accessibility: Semantic HTML, clear link structure
Mobile: Responsive grid layout
Dark Mode: Built-in (zinc/violet/amber)
```

### NewsletterSignup Component
```
SuperDesign ID: form-newsletter
Framework: React 19 + Next.js 16 + Tailwind CSS
Props: NewsletterSignupProps (see above)
CSS: Inline Tailwind classes
State: email, isSubmitting, isSuccess, error
Accessibility: Form labels, error messages, loading state
Mobile: Full width, stacked on mobile
Dark Mode: Built-in (zinc/violet/amber)
API: POST /api/newsletter
```

### LeadCaptureModal Component
```
SuperDesign ID: modal-lead-capture
Framework: React 19 + Next.js 16 + Tailwind CSS
Props: LeadCaptureModalProps (see above)
CSS: Inline Tailwind classes
State: email, interest, isSubmitting, isSubmitted
Accessibility: Modal dialog, focus management, close button
Mobile: Full screen on mobile, centered on desktop
Dark Mode: Built-in (navy/violet/amber gradient)
Storage: localStorage (lead data)
```

---

## Component Library Structure

Proposed folder structure for SuperDesign-managed components:
```
src/components/
├── Layout/
│   ├── NavBar.tsx         (extracted SiteNav)
│   ├── Footer.tsx         (extracted SiteFooter)
│   └── index.ts
├── Forms/
│   ├── NewsletterSignup.tsx
│   ├── LeadCaptureModal.tsx
│   └── index.ts
├── UI/
│   ├── FloatingContact.tsx
│   ├── ReadingProgressBar.tsx
│   └── index.ts
└── index.ts
```

---

## Customization Examples

### NavBar Variants
```tsx
// Variant 1: Custom links
<NavBar 
  links={[
    { label: 'Home', href: '/' },
    { label: 'Docs', href: '/docs' },
  ]}
  ctaText="Get Started"
  ctaHref="/signup"
/>

// Variant 2: Compact (mobile-only)
<NavBar variant="compact" />

// Variant 3: Transparent (for dark hero)
<NavBar variant="transparent" />
```

### Footer Variants
```tsx
// Variant 1: Full footer
<Footer 
  sections={[
    {
      title: 'Product',
      links: [...]
    },
    // ... more sections
  ]}
/>

// Variant 2: Minimal footer
<Footer variant="minimal" />

// Variant 3: With company info
<Footer 
  copyrightText="© 2026 Company Name"
  socialLinks={[...]}
/>
```

### NewsletterSignup Variants
```tsx
// Variant 1: Full card (default)
<NewsletterSignup variant="default" />

// Variant 2: Inline (compact)
<NewsletterSignup variant="compact" />

// Variant 3: Without social proof
<NewsletterSignup showSocialProof={false} />

// Variant 4: Custom callback
<NewsletterSignup 
  onSuccess={(email) => {
    console.log('Subscribed:', email);
  }}
/>
```

---

## Integration Points

### API Endpoints
- `/api/newsletter` - Email subscription
- `/api/contact` - Contact form
- `/api/signup` - User signup
- `/api/try` - Trial request
- `/api/checkout` - Stripe checkout

### Analytics
- `analytics.page(name)` - Page view
- `analytics.ctaClick(section, action)` - Button click
- `analytics.leadCaptureShow(trigger)` - Modal display
- `analytics.leadCaptureSubmit(email, interest)` - Form submit

### External Services
- **Stripe** - Payment processing
- **Google Analytics** - GA4 tracking
- **Email Service** - Newsletter/drip campaigns

---

## Testing Recommendations

### Unit Tests
- Form validation (newsletter, lead capture)
- State changes (modal open/close, form submission)
- Error handling
- Success message display

### Integration Tests
- API endpoint calls
- localStorage operations
- Analytics tracking
- Navigation routing

### Visual Tests
- Responsive layouts (mobile, tablet, desktop)
- Dark mode rendering
- Animation/transitions
- Hover states

---

## Performance Considerations

### Code Splitting
- LeadCaptureModal - lazy load on-demand
- FloatingContact - lazy load after hydration
- NewsletterSignup - load inline or lazy

### Bundle Size
- Lucide icons - tree-shakeable
- Tailwind CSS - already global
- Next.js Link - already optimized

### Rendering
- All client components (useState, useEffect)
- Footer is server component (static)
- Nav is client (interactivity needed)

---

## Accessibility

### WCAG Compliance
- ✅ Semantic HTML (form, nav, footer)
- ✅ ARIA labels on buttons
- ✅ Keyboard navigation support
- ✅ Focus management in modals
- ✅ Skip-to-content link

### Keyboard Support
- Tab navigation through all interactive elements
- Enter to submit forms
- Escape to close modals
- Enter/Space to toggle menus

### Screen Readers
- Form labels properly associated
- Error messages announced
- Success feedback provided
- Navigation structure clear
