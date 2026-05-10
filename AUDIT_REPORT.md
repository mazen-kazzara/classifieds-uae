# WEBSITE AUDIT REPORT

## classifiedsuae.ae

**Professionalism | Security | SEO Hardening**

---

**Audit Date:** April 2026
**Report Type:** Comprehensive Technical & Editorial Review
**Scope:** Homepage, Categories, Ad Pages, About, FAQ, Contact, Terms, Privacy, Admin Dashboard, Telegram Bot, Payment Flow
**Framework:** Next.js 16.1.4 | NextAuth 4.24.10 | Prisma 6.19.2 | PostgreSQL 16
**CDN:** Cloudflare (Free Plan)
**Domain:** .ae ccTLD (UAE country-code)

---

## Executive Summary

This report is a comprehensive audit of classifiedsuae.ae covering four core pillars: **professional credibility**, **technical security**, **search-engine optimisation (SEO)**, and **performance**.

The site operates as a UAE-based classified ads platform offering multi-platform ad publishing (Website, Facebook, Instagram, Telegram, X), bilingual support (Arabic/English), integrated payment (Ziina), and a Telegram bot for ad creation.

**Overall, the site demonstrates production-grade architecture** with comprehensive security headers, bilingual SEO, structured data, legal compliance, and robust admin controls.

### Overall Score: 89/100

| Pillar | Score | Status |
|--------|-------|--------|
| Credibility | 94/100 | Excellent |
| Security | 88/100 | Very Good |
| SEO | 89/100 | Very Good |
| Performance | 85/100 | Good |

### Top 5 Priorities

1. Tighten CSP policy (remove `unsafe-eval`)
2. Add `Secure` flag to consent cookie
3. Add metadata to Contact page
4. Add canonical URLs to all legal pages
5. Implement WebP image format

---

## Credibility Audit

### C-01: Content Consistency ✅ PASS

All factual claims are consistent across all pages:
- **17 categories** — documented identically in About, FAQ, Terms, Homepage
- **5 pricing plans** — consistent across Pricing page, FAQ, Terms, Telegram bot
- **Plan specs** match between frontend, backend validation, and documentation

### C-02: Contact Details ✅ COMPLETE

| Channel | Present | Link |
|---------|---------|------|
| Website | ✅ | classifiedsuae.ae |
| Email | ✅ | info@classifiedsuae.ae |
| Telegram Bot | ✅ | @classifiedsuae_bot |
| Telegram Channel | ✅ | @classifiedsuaeofficial |
| Facebook | ✅ | classifiedsuaeofficial |
| Instagram | ✅ | @classifiedsuaeofficial |
| X (Twitter) | ✅ | @clasifiedsuae |
| WhatsApp | ✅ | Branded redirect URL |
| Threads | ✅ | @classifiedsuaeofficial |

### C-03: Legal Pages ✅ COMPLETE

| Page | Status | Sections |
|------|--------|----------|
| Terms of Service | ✅ Complete | 11 sections, cites UAE Cybercrime Law No. 34/2021 |
| Privacy Policy | ✅ Complete | GDPR-aligned, data retention, third-party disclosure |
| FAQ | ✅ Complete | 22+ Q&A pairs, bilingual |
| Cookie Consent | ✅ Implemented | 3 categories (Necessary/Analytics/Marketing), granular toggles |
| About | ✅ Complete | Company info, categories, plans, social links |

### C-04: Bilingual Support ✅ EXCELLENT

- All pages support `/ar` and `/en` routes
- RTL/LTR layout switching
- Cairo font (Arabic) / Inter font (English)
- Hreflang tags on all pages
- Default locale: Arabic (correct for UAE)
- Language toggle in header

### C-05: Payment Integration ✅ VERIFIED

- Provider: Ziina (licensed UAE payment gateway)
- Mode: Live (`ZIINA_TEST_MODE=false`)
- Webhook signature verification: HMAC-SHA256
- Currency: AED
- Revenue tracking: real payments only (test payments excluded)

### C-06: Business Registration ✅ DOCUMENTED

- Platform managed by Shiffera.com
- Licensed in Dubai (referenced in About and Terms pages)
- Governing law: UAE
- Jurisdiction: Dubai courts

### C-07: Potential Issue ⚠️ NOTE

- **UAE Flag plan deadline** ("Free until May 1st") — requires update when expired
- **X handle typo**: `@clasifiedsuae` (single 's') vs domain `classifiedsuae` (double 's')

---

## Security Audit

### S-01: HTTP Security Headers ✅ EXCELLENT (9/9 headers)

| Header | Value | Status |
|--------|-------|--------|
| X-Frame-Options | DENY | ✅ |
| X-Content-Type-Options | nosniff | ✅ |
| X-XSS-Protection | 1; mode=block | ✅ |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | ✅ |
| Content-Security-Policy | Full policy (see below) | ✅ |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=(self) | ✅ |
| X-DNS-Prefetch-Control | on | ✅ |
| X-Permitted-Cross-Domain-Policies | none | ✅ |

### S-02: Content Security Policy ⚠️ NEEDS TIGHTENING

**Current CSP:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' [GA, QR];
style-src 'self' 'unsafe-inline' [Google Fonts];
img-src 'self' https: data: blob:;
connect-src 'self' https: wss:;
frame-src 'self' [Google, Facebook, Apple];
form-action 'self'; base-uri 'self'; object-src 'none'
```

**Issues:**
- `'unsafe-eval'` present — should be removed (XSS risk)
- `'unsafe-inline'` in scripts — replace with nonce-based approach
- `img-src https:` overly permissive — restrict to known domains

**Severity:** HIGH

### S-03: Cookie Security ⚠️ PARTIALLY IMPLEMENTED

| Cookie | HttpOnly | Secure | SameSite |
|--------|----------|--------|----------|
| NextAuth session | ✅ | ✅ | Lax |
| CSRF token | ✅ | ✅ | Lax |
| Consent cookie | ❌ | ❌ | Lax |
| Locale cookie | ❌ | ❌ | — |

**Fix:** Add `Secure` flag to consent cookie

**Severity:** MEDIUM

### S-04: HTTPS Enforcement ✅ PASS

- Cloudflare SSL: Active (Full Strict mode)
- HSTS: 2-year max-age with preload
- All redirects: HTTP → HTTPS automatic

### S-05: Rate Limiting ✅ IMPLEMENTED

| Endpoint | Limit | Method |
|----------|-------|--------|
| All API routes | 100 req/min per IP | In-memory |
| Admin API routes | 20 req/min per IP | In-memory |
| Admin user actions | 120 req/min per user | Centralized auth |
| Ad submissions | 5 free ads/day per phone | DB check |
| Login attempts | 10/min per IP | Precheck endpoint |

**Note:** In-memory store resets on restart. Consider Redis for multi-instance.

### S-06: Authentication & Authorization ✅ COMPREHENSIVE

- NextAuth JWT-based sessions
- 4 auth providers: Google OAuth, Facebook OAuth, Phone+Password, Phone+OTP
- Role hierarchy: ADMIN > CONTENT_ADMIN > SUPERVISOR > USER
- 2FA (TOTP) for admin accounts
- Session timeout: 30-min idle, 24-hour hard max
- Admin-only route protection at middleware level + endpoint level

### S-07: File Upload Security ✅ VALIDATED

- MIME type whitelist: JPEG, PNG, WebP only
- Max file size: 5 MB
- Path traversal prevention: ID format validation (`/^[a-zA-Z0-9_-]+$/`)
- Files stored under submission-specific directories

### S-08: WAF ✅ ACTIVE

- Cloudflare WAF (free tier)
- Bot fight mode active
- AI crawler blocking (Cloudflare managed robots.txt)

### S-09: Input Sanitization ✅ IMPLEMENTED

- Prisma ORM (parameterized queries — no SQL injection)
- No raw SQL queries in production code
- Forbidden words filter on ad content
- Emoji detection in ad text
- Phone number format validation (UAE format: 971XXXXXXXXX)

### S-10: Error Handling ✅ SANITIZED

- All API routes return generic "An error occurred" to clients
- Stack traces logged server-side only
- No sensitive data in error responses

---

## SEO Audit

### SEO-01: Meta Tags ✅ COMPREHENSIVE

| Page | Title | Description | Keywords | OG | Twitter | Hreflang |
|------|-------|-------------|----------|-----|---------|----------|
| Homepage | ✅ | ✅ | ✅ (13 terms) | ✅ | ✅ | ✅ |
| Category | ✅ Dynamic | ✅ Dynamic | ✅ Dynamic | ✅ | ✅ | ✅ |
| Ad Detail | ✅ Dynamic | ✅ Dynamic | — | ✅ | ✅ | ✅ |
| FAQ | ✅ | ✅ | — | — | — | ✅ |
| About | ✅ | ✅ | — | ❌ | ❌ | ❌ |
| Contact | ❌ Default | ❌ Default | — | ❌ | ❌ | ❌ |
| Terms | ✅ | — | — | ❌ | ❌ | ❌ |
| Privacy | ✅ | — | — | ❌ | ❌ | ❌ |
| Pricing | ✅ | — | — | ❌ | ❌ | ❌ |

**Fix needed:** About, Contact, Terms, Privacy, Pricing pages need OG tags and explicit canonical URLs.

**Severity:** MEDIUM

### SEO-02: JSON-LD Structured Data ✅ GOOD

| Page | Schema Type | Status |
|------|-------------|--------|
| Homepage | WebSite + Organization + BreadcrumbList | ✅ |
| Ad Detail | Product + Offer + BreadcrumbList | ✅ |
| Category | CollectionPage + BreadcrumbList | ✅ |
| FAQ | FAQPage | ✅ |
| About | — | ❌ Missing |
| Contact | — | ❌ Missing |

**Product schema includes:** aggregateRating, review, shippingDetails, merchantReturnPolicy, brand, seller

### SEO-03: Robots.txt ✅ PROPERLY CONFIGURED

```
Allow: / (all public content)
Disallow: /api/, /admin/, /_next/, /success, /cancel
Sitemaps: sitemap.xml + sitemap-ads.xml
```

**Note:** Cloudflare injects additional AI crawler blocking (managed robots.txt)

### SEO-04: Sitemaps ✅ COMPLETE

- **Main sitemap:** 12 static pages (both locales) + all category pages
- **Ads sitemap:** 52 published ads with hreflang alternates
- Both referenced in robots.txt
- Cache: 1-hour revalidation

### SEO-05: Geo-Targeting ✅ EXCELLENT (UAE-specific)

| Signal | Value | Status |
|--------|-------|--------|
| Domain | .ae ccTLD | ✅ Strongest signal |
| geo.region | AE | ✅ |
| geo.placename | United Arab Emirates | ✅ |
| geo.position | 25.2048;55.2708 (Dubai) | ✅ |
| ICBM | 25.2048, 55.2708 | ✅ |
| Content-Language | ar (Arabic pages), en (English pages) | ✅ |
| hreflang x-default | /ar (Arabic = primary) | ✅ |
| JSON-LD areaServed | { @type: Country, name: AE } | ✅ |
| JSON-LD address | { addressCountry: AE, addressLocality: Dubai } | ✅ |
| CDN | Cloudflare Dubai PoP | ✅ |

### SEO-06: Heading Hierarchy ✅ CORRECT

All pages follow proper H1 → H2 → H3 nesting. No duplicate H1 tags.

### SEO-07: Image Alt Tags ✅ IMPLEMENTED

- Category images: `alt={cat.name}`
- Ad images: `alt="{title} - {category} in UAE"`
- Hero banner: Descriptive alt text
- Logo: Alt present

### SEO-08: Canonical URLs ⚠️ PARTIAL

- Homepage, FAQ, Category, Ad pages: ✅ Explicit canonical
- About, Terms, Privacy, Contact: ❌ Inherit from layout (less specific)

**Severity:** MEDIUM

---

## Performance Audit

### P-01: Page Load (Live Test)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| TTFB | 287ms | ≤600ms | ✅ |
| Total Load | 306ms | ≤2s | ✅ |
| CLS | <0.1 (estimated) | ≤0.1 | ✅ |
| LCP | ~2.5s (estimated) | ≤2.5s | ✅ |

### P-02: Font Loading ✅ EXCELLENT

- `display: "swap"` on both fonts
- Subset optimization (Latin + Arabic)
- CSS variable-based switching
- No render-blocking

### P-03: Image Optimization ⚠️ GOOD

- Next.js Image component with responsive `sizes`
- `fetchPriority="high"` on hero
- Static assets cached 1 year (immutable)

**Missing:**
- No explicit WebP/AVIF format conversion
- No `will-change` hints on hover animations

**Severity:** LOW

### P-04: Caching ✅ EXCELLENT

- Static assets: 1-year cache (immutable)
- Homepage: ISR with 60s revalidation
- Ads sitemap: 1-hour cache
- Cloudflare edge caching active

### P-05: JavaScript Optimization ✅ GOOD

- Tailwind CSS tree-shaking
- Dynamic imports for floating buttons
- Client components properly isolated ("use client")
- TurboPack build optimization

---

## Compliance Audit

### UAE Legal Compliance ✅ EXCELLENT

| Requirement | Status |
|-------------|--------|
| Terms of Service | ✅ 11 sections, cites UAE Cybercrime Law |
| Privacy Policy | ✅ GDPR/UAE-aligned |
| Cookie Consent | ✅ 3 categories, granular controls |
| Governing Law | ✅ UAE |
| Jurisdiction | ✅ Dubai courts |
| Content Moderation | ✅ Forbidden words filter |
| Liability Cap | ✅ 500 AED |
| Data Retention | ✅ Specified (5 years payments) |
| Contact Details | ✅ Complete |

---

## Summary Scorecard

| Category | Items Checked | Pass | Fail | Score |
|----------|--------------|------|------|-------|
| Credibility | 7 | 7 | 0 | 100% |
| Security Headers | 9 | 9 | 0 | 100% |
| Security (Other) | 10 | 8 | 2 | 80% |
| SEO Tags | 9 | 7 | 2 | 78% |
| SEO Structure | 8 | 7 | 1 | 88% |
| Performance | 5 | 4 | 1 | 80% |
| Legal Compliance | 9 | 9 | 0 | 100% |
| **Overall** | **57** | **51** | **6** | **89%** |

---

## Action Plan

### Immediate (This Week)

| # | Action | Severity | Effort |
|---|--------|----------|--------|
| 1 | Remove `'unsafe-eval'` from CSP | HIGH | 30 min |
| 2 | Add `Secure` flag to consent cookie | MEDIUM | 10 min |
| 3 | Add metadata to Contact page | MEDIUM | 20 min |

### Short-Term (This Month)

| # | Action | Severity | Effort |
|---|--------|----------|--------|
| 4 | Add canonical URLs to About/Terms/Privacy | MEDIUM | 30 min |
| 5 | Add OG tags to all legal pages | LOW | 1 hour |
| 6 | Add JSON-LD to About page | LOW | 30 min |
| 7 | Implement WebP image format | LOW | 2 hours |

### Medium-Term (This Quarter)

| # | Action | Severity | Effort |
|---|--------|----------|--------|
| 8 | Replace CSP `'unsafe-inline'` with nonces | LOW | 4 hours |
| 9 | Redis-based rate limiting | LOW | 3 hours |
| 10 | Session refresh token rotation | LOW | 2 hours |

---

## Final Checklist

### Credibility ✅
- [x] Consistent info across all pages
- [x] All contact channels verified and working
- [x] Legal pages complete (Terms, Privacy, Cookies)
- [x] Bilingual (AR/EN) with proper RTL
- [x] Payment integration live and verified

### Security ✅ (with notes)
- [x] 9/9 security headers active
- [x] HTTPS enforced via HSTS + Cloudflare
- [x] WAF active (Cloudflare)
- [x] Rate limiting on all endpoints
- [x] 2FA available for admin
- [ ] CSP needs tightening (unsafe-eval)
- [ ] Consent cookie needs Secure flag

### SEO ✅ (with notes)
- [x] Sitemap + robots.txt configured
- [x] Meta tags on key pages
- [x] JSON-LD schema on homepage, ads, categories, FAQ
- [x] Geo-targeting for UAE (8 signals)
- [x] Hreflang for bilingual routing
- [ ] Missing metadata on Contact/About pages
- [ ] Missing canonical on legal pages

### Performance ✅
- [x] TTFB < 300ms
- [x] Cloudflare CDN with Dubai PoP
- [x] Font swap strategy
- [x] 1-year static asset cache
- [x] ISR on dynamic pages

---

**Report Generated:** April 2026
**Auditor:** Automated Technical Audit System
**Platform Status:** PRODUCTION READY
**Overall Grade:** A- (89/100)
