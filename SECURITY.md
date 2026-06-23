# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅ Full support |

## Reporting a Vulnerability

SafeVixAI handles emergency-related data (emergency service locations, SOS requests, user location data). Security is a top priority.

**Do not report security vulnerabilities through public GitHub issues or discussions.**

### How to Report

**Primary channel:** Email `safevixai@googlegroups.com`
**Secondary channel:** GitHub [Private Vulnerability Reporting](https://github.com/SafeVixAI/SafeVixAI/security/advisories)

### What to Include

- Type of issue (XSS, SQL injection, auth bypass, SSRF, etc.)
- Steps to reproduce (including any prerequisites)
- Affected endpoints, files, or components
- Proof of concept (if available)
- Potential impact and exploitability
- Suggested fix (if known)

### Response SLA

| Step | Timeframe |
|------|-----------|
| Acknowledgment | Within 48 hours |
| Triage + severity assessment | Within 5 business days |
| Fix development | Within 14 days (Critical), 30 days (High), 90 days (Medium/Low) |
| Advisory publication | Within 7 days of fix release |
| CVE assignment | Within 14 days of fix release |

### Disclosure Policy

1. Reporter reports vulnerability privately
2. Security Team acknowledges within 48 hours
3. Fix is developed in a private fork
4. Fix is released and deployed
5. Security advisory is published with CVE
6. Reporter is credited (if desired)

We follow **coordinated disclosure**: reporters agree to wait for the fix to be released before public disclosure.

## Security Practices

### Authentication & Authorization
- JWT-based authentication with refresh tokens (HS256, 24h access / 30d refresh)
- Guest auth with anonymous UUID (no personal data required)
- Service-to-service auth via `X-Internal-Api-Key` header
- Static mock token rejection in middleware
- Admin endpoint HMAC constant-time comparison

### API Security
- CSRF protection on all state-changing requests
- Content Security Policy (CSP) headers in production (no `unsafe-eval`)
- ALLOWED_HOSTS middleware for Host header validation
- Security headers: HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy
- Rate limiting on all public endpoints (5 tiers: general 100/min, auth 5/min, SOS 3/min, challan 60/min, chat 30/min, geocode 30/min)
- Input validation via Pydantic schemas (GPS bounds, file types, sizes)
- CORS restricted in production (no wildcard)
- Request-ID correlation on all requests

### Data Privacy
- GPS location cached only, not stored server-side
- Blood group and emergency contacts stored only in IndexedDB (never sent to server)
- Chat history stored in Redis with 24-hour TTL
- Offline data never leaves the device
- EXIF metadata stripped on all uploads

### LLM Security
- SafetyChecker with 60+ injection patterns (jailbreak, NFKC, zero-width, l33t, RAG prompt injection)
- Any injury-related response MUST start with "Call 112 immediately"
- `asyncio.wait_for()` timeout on all provider calls
- RAG snippet sanitization before LLM context injection
- MCP server authentication with rate limiting

### Dependency Security
- All dependencies pinned to exact versions in `requirements.txt` and `package.json`
- Dependabot configured for automated dependency updates (weekly)
- `pip-audit` and `npm audit` run in CI on every push
- Trivy filesystem scanning with SARIF upload on every push
- Gitleaks secret scanning with custom patterns (18 provider-specific rules)
- Dependency review on all pull requests
- Software Bill of Materials (SBOM) generated in CycloneDX and SPDX formats

### Supply Chain Security
- Docker images signed with cosign (keyless signing via GitHub OIDC)
- SBOM generated and attached to every release
- OpenSSF Scorecard analysis run weekly
- CodeQL analysis on every push (Python + JavaScript/TypeScript)
- Pre-commit hooks for local secret detection and code quality

## Vulnerability Management Process

1. **Identification** — Vulnerability reported or discovered internally
2. **Triage** — Security Team assesses severity, impact, and affected versions
3. **Fix** — Patch developed in private fork with regression tests
4. **Review** — Security Team reviews fix for completeness and side effects
5. **Release** — Fix merged, version bumped, advisory published with CVE
6. **Communication** — Users notified via GitHub Advisory and release notes

## Security.txt

This project publishes a `security.txt` file at:
`https://app.safevixai.com/.well-known/security.txt`

```
Canonical: https://github.com/SafeVixAI/SafeVixAI/SECURITY.md
Contact: mailto:safevixai@googlegroups.com
Expires: 2027-06-15T00:00:00.000Z
Preferred-Languages: en, hi, ta, te, bn, mr
Encryption: https://github.com/SafeVixAI/SafeVixAI/blob/main/SECURITY.md
Policy: https://github.com/SafeVixAI/SafeVixAI/security/policy
```

## Vulnerability Reporter Credit

SafeVixAI follows responsible disclosure and credits vulnerability reporters unless they explicitly request anonymity. Credits are published in:

- The GitHub Security Advisory for the reported vulnerability
- The release notes for the fix release
- `ADOPTERS.md` (if the reporter consents)

Reporters may choose to be credited by name, pseudonym, or remain anonymous.

## Past Security Advisories

See [GitHub Security Advisories](https://github.com/SafeVixAI/SafeVixAI/security/advisories) for published advisories.
