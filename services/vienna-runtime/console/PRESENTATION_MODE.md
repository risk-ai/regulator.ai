# Vienna OS Presentation Mode

Premium UI makeover for product demonstrations.

## Quick Start

### 1. Enable Presentation Mode

Edit `client/src/main.tsx`:

```typescript
// BEFORE (normal mode):
import { App } from './App.js';

// AFTER (presentation mode):
import { App } from './AppPresentation.js';
```

### 2. Rebuild Frontend

```bash
cd vienna-core/console/client
npm run build
```

### 3. Restart Server

```bash
cd vienna-core/console/server
npm start
```

### 4. Access Dashboard

Navigate to: `http://100.120.116.10:5174` (or your configured URL)

---

## What's Different?

### Visual Enhancements

**Premium Dark Theme:**
- Deeper blacks (#000000 app background)
- Glass morphism effects
- Animated gradients
- Glow effects on interactive elements
- Smooth transitions and animations

**Enhanced Navigation:**
- Larger, more prominent nav bar
- Icon support for each section
- Active state with gradient highlight
- System status indicators
- Animated underlines

**Professional Dashboard:**
- Key metrics with trend indicators
- Real-time activity timeline
- System health visualization
- Pipeline stage diagram
- Phase progress tracking
- Premium card layouts

**Typography:**
- Gradient text effects
- Better hierarchy
- Improved readability
- Display font for headers

### Components Added

- `AppPresentation.tsx` — Presentation mode app shell
- `PresentationNav.tsx` — Premium navigation bar
- `PremiumDashboard.tsx` — Polished dashboard component
- `PresentationNowPage.tsx` — Enhanced Now page
- `presentation.css` — Premium styles and animations

### Features

**Glass Morphism:**
- Translucent panels with backdrop blur
- Layered depth perception
- Modern aesthetic

**Animated Gradients:**
- Color-shifting text
- Border animations
- Smooth transitions

**Status Visualization:**
- Pulse animations for live status
- Color-coded health indicators
- Progress bars with glow effects

**Timeline Components:**
- Vertical timeline with animated dots
- Status-based coloring
- Hover effects

**Premium Buttons:**
- Gradient backgrounds
- Elevation on hover
- Smooth state transitions

---

## Customization

### Adjust Colors

Edit `client/src/styles/presentation.css`:

```css
:root {
  --accent-primary: #6366f1;  /* Primary brand color */
  --accent-secondary: #8b5cf6; /* Secondary accent */
  --accent-tertiary: #ec4899;  /* Tertiary accent */
}
```

### Modify Metrics

Edit `client/src/components/dashboard/PremiumDashboard.tsx`:

Update the `MetricCard` values in the grid:

```tsx
<MetricCard
  label="Your Metric"
  value="123"
  trend="up"
  trendValue="+5%"
  icon="🎯"
  status="healthy"
/>
```

### Add Timeline Events

Edit `PremiumDashboard.tsx` timeline section:

```tsx
<TimelineItem
  time="Just now"
  title="Your Event"
  description="Event description"
  status="success"
/>
```

---

## Revert to Normal Mode

Edit `client/src/main.tsx`:

```typescript
// Switch back to normal mode:
import { App } from './App.js';
```

Rebuild:

```bash
cd vienna-core/console/client
npm run build
```

---

## Tips for Presentations

1. **Start on Now page** — Shows complete system overview
2. **Highlight the pipeline diagram** — Demonstrates governance architecture
3. **Show timeline activity** — Proves real-time operation
4. **Point out health metrics** — Shows monitoring capabilities
5. **Use the phase progress** — Demonstrates development maturity

---

## Troubleshooting

**Styles not applying?**
- Clear browser cache
- Rebuild client: `npm run build`
- Check `presentation.css` is imported in `AppPresentation.tsx`

**Blank page?**
- Check browser console for errors
- Verify `AppPresentation.tsx` import in `main.tsx`
- Ensure server is running

**Dashboard shows placeholder?**
- Only "Now" page has full implementation
- Other pages show intentional placeholder
- Click "Back to Now" to return

---

## Production Deployment

For production demos:

1. Build with production flag:
   ```bash
   npm run build -- --mode production
   ```

2. Use environment variables for branding:
   ```bash
   VITE_APP_TITLE="Vienna OS Demo"
   VITE_ORG_NAME="Your Organization"
   ```

3. Consider deploying to Vercel/Netlify for public access

---

## Notes

- Presentation mode is **purely visual** — no functionality changes
- All data and APIs remain the same
- Safe to toggle between normal and presentation mode
- No database or backend changes required
- Animations are hardware-accelerated for smooth performance

---

**Built for presentations. Designed to impress.**
