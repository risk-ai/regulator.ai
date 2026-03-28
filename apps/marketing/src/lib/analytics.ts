export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

// Specific funnel events
export const analytics = {
  signupPageView: () => trackEvent('signup_page_view'),
  signupFormStart: () => trackEvent('signup_form_start'),
  signupFormSubmit: (plan: string) => trackEvent('signup_form_submit', { plan }),
  signupSuccess: (plan: string) => trackEvent('signup_success', { plan, value: 1 }),
  pricingView: () => trackEvent('pricing_page_view'),
  pricingPlanClick: (plan: string) => trackEvent('pricing_plan_click', { plan }),
  tryDemoStart: () => trackEvent('try_demo_start'),
  tryDemoComplete: () => trackEvent('try_demo_complete'),
  blogView: (slug: string) => trackEvent('blog_view', { slug }),
  docsView: (section: string) => trackEvent('docs_view', { section }),
  ctaClick: (location: string, cta: string) => trackEvent('cta_click', { location, cta }),
};