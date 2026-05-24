---
name: web
version: 1
category: frontend
---

# Web Development

End-to-end web feature development: SSR/SSG frameworks, routing, web performance, SEO, forms, and authentication flows.

## When to use this skill

- User is building a web app or website (not specifically frontend components or backend APIs)
- User mentions Next.js, Nuxt, SvelteKit, Remix, Astro, or similar full-stack frameworks
- User asks about server-side rendering (SSR), static generation (SSG), or ISR
- User wants to improve Core Web Vitals, Lighthouse score, or SEO
- User asks about authentication flows (sign-in, OAuth, session management)
- User wants to add forms with validation
- User asks about web security headers, CSP, or HTTPS setup

## Procedure

### Step 1: Identify the rendering strategy

This affects every architectural decision:
- **CSR** (Client-Side Rendering): React SPA, Vue SPA — all rendering in browser, poor initial SEO
- **SSR** (Server-Side Rendering): Next.js pages, Nuxt — rendered on server per request, good SEO, higher server cost
- **SSG** (Static Site Generation): Next.js `getStaticProps`, Astro — pre-rendered at build time, fastest delivery
- **ISR** (Incremental Static Regeneration): Next.js `revalidate` — SSG with background refresh
- **Hybrid**: different strategies per route (most modern frameworks support this)

```bash
# Next.js: check what's used per page
grep -rn "getServerSideProps\|getStaticProps\|generateStaticParams" app/ pages/ --include="*.ts" --include="*.tsx" | head -20
```

### Step 2: Performance audit

Run Lighthouse before making changes — you need a baseline:
```bash
npx lighthouse http://localhost:3000 --only-categories=performance,accessibility,seo --output=json | jq '.categories | {perf: .performance.score, a11y: .accessibility.score, seo: .seo.score}'
```

Core Web Vitals targets:
- **LCP** (Largest Contentful Paint): < 2.5s (loading)
- **FID/INP** (Interaction to Next Paint): < 200ms (interactivity)
- **CLS** (Cumulative Layout Shift): < 0.1 (visual stability)

Common fixes:
- Images without width/height → layout shift (CLS)
- Render-blocking scripts in `<head>` → slow LCP
- Web fonts without `font-display: swap` → invisible text flash
- Large JavaScript bundles → slow FID/INP

```bash
# Analyze bundle size (Next.js)
npx @next/bundle-analyzer
# or
ANALYZE=true next build
```

### Step 3: SEO audit

```bash
# Check meta tags
curl -s http://localhost:3000 | grep -E '<(title|meta)' | head -20
```

Required for every page:
- `<title>` — unique per page, 50–60 characters
- `<meta name="description">` — unique per page, 120–160 characters
- `<meta property="og:title">` and `og:image` for social sharing
- Canonical URL: `<link rel="canonical" href="...">`

Structured data (Schema.org JSON-LD) for:
- Articles, products, FAQs, events — increases rich snippet eligibility

```bash
# Validate structured data
curl -s http://localhost:3000 | python3 -c "import sys,re; print('\n'.join(re.findall(r'application/ld\+json[^>]*>(.*?)</script>', sys.stdin.read(), re.DOTALL)))"
```

### Step 4: Form handling

Every form needs:
1. **Client-side validation** (immediate feedback, don't wait for server)
2. **Server-side validation** (always — client validation can be bypassed)
3. **Clear error messages** (field-level, not just at the top)
4. **Loading state** during submission
5. **Success/failure feedback**

```ts
// Server Action (Next.js 14+)
async function submitForm(formData: FormData) {
  'use server';
  const email = formData.get('email');
  if (!email || !isValidEmail(email)) {
    return { error: 'Enter a valid email address' };
  }
  // process...
}
```

### Step 5: Authentication

Use established libraries — never hand-roll auth:
- **Next.js**: NextAuth.js / Auth.js
- **Nuxt**: nuxt-auth
- **SvelteKit**: Lucia
- **General**: Clerk, Auth0, Supabase Auth

Check security requirements:
- HTTPS in production (HTTP Strict Transport Security header)
- Tokens: HttpOnly cookies for session tokens (not localStorage — XSS risk)
- CSRF protection for mutation endpoints
- Rate limiting on auth endpoints

```bash
# Check security headers
curl -I https://yourdomain.com | grep -iE '(strict-transport|content-security|x-frame|x-content-type)'
```

### Step 6: Web security headers

Add these to your server/CDN:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{NONCE}'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Test at: https://securityheaders.com

### Step 7: Routing and navigation

- Every URL should be bookmarkable and shareable
- Back button must work correctly (no history manipulation without reason)
- Loading UI for route transitions (avoid blank pages during navigation)
- 404 page that helps users navigate back

```bash
# Next.js: check for missing loading.tsx files
find app/ -name "page.tsx" | while read f; do
  dir=$(dirname "$f")
  [ ! -f "$dir/loading.tsx" ] && echo "Missing loading.tsx in $dir"
done
```

## Common patterns

### Image optimization (Next.js)
```tsx
import Image from 'next/image';
// Always use next/image — never plain <img> for content images
<Image
  src="/hero.jpg"
  alt="Hero image description"
  width={1200}
  height={600}
  priority  // for above-the-fold images
/>
```

### Environment variables
```bash
# Public (browser-accessible): NEXT_PUBLIC_* prefix
# Private (server-only): no prefix
# Never: commit .env.local or .env.production
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

## Red flags to report

- `<img>` tags without width/height (causes CLS)
- Secrets in `NEXT_PUBLIC_*` variables (exposed to browser)
- Authentication tokens stored in `localStorage` (XSS vulnerable)
- No server-side validation (client-side only)
- All pages using SSR when they could be SSG (unnecessary server load)
- Missing `<meta name="viewport">` (breaks mobile rendering)
- Linking to HTTP resources from HTTPS pages (mixed content)
- Forms submitting GET requests with sensitive data (visible in URL and logs)
- `dangerouslySetInnerHTML` with unsanitized user content
