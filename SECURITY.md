# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

SafeVixAI handles emergency-related data (emergency service locations, SOS requests, user location data). Security is a top priority.

**Do not report security vulnerabilities through public GitHub issues.**

Instead, email the maintainers directly or use GitHub's private vulnerability reporting.

### What to include:
- Type of issue (XSS, SQL injection, auth bypass, etc.)
- Steps to reproduce
- Affected endpoints/files
- Potential impact

### Our commitment:
- Acknowledgment within 48 hours
- Regular updates on fix progress
- Credit upon disclosure (if desired)

## Security Practices

- JWT-based authentication with refresh tokens
- CSRF protection on all state-changing requests
- CSP headers in production
- Input validation via Pydantic schemas
- Rate limiting on all public endpoints
- Prompt injection defense on chatbot
- Offline data stored in IndexedDB (never leaves device)
- Blood group / emergency contacts never sent to server
