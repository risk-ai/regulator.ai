# Google Search Console Setup — regulator.ai

## Status: Needs Max to verify domain

### Steps (5 minutes)

1. Go to https://search.google.com/search-console
2. Sign in with the Google account you want to manage the property
3. Click "Add property" → select "Domain" → enter `regulator.ai`
4. Google will give you a TXT record value like: `google-site-verification=XXXXXXXXXXXX`
5. **Give me that value** and I'll add it via the Vercel DNS API automatically
6. Click "Verify" in GSC

### After Verification

I will:
- Submit the sitemap (`https://regulator.ai/sitemap.xml`)
- Request indexing for all 30+ pages
- Monitor indexing status

### Why This Matters

Without GSC verification:
- Google has no sitemap to crawl
- We can't request priority indexing
- We can't see search performance data
- Blog posts won't rank for target keywords

This is the #1 SEO blocker right now.

### DNS Access

DNS is on Vercel — I have full API access to add TXT records. Just need the verification string.

```bash
# I'll run this once I have the value:
curl -X POST "https://api.vercel.com/v2/domains/regulator.ai/records" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"","type":"TXT","value":"google-site-verification=XXXXX","ttl":60}'
```
