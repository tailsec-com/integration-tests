# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub Issues.**

Instead, please report them via:

1. **Email**: Send to `security@tailsec.io` with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

2. **GitHub Private Vulnerability Reporting** (recommended for GitHub users):
   - Go to the Security tab of this repository
   - Click "Report a vulnerability"

### What to Expect

- **Response time**: We aim to respond within 48 hours
- **Initial assessment**: We'll confirm the vulnerability and assess severity
- **Updates**: We'll keep you updated on our progress
- **Disclosure**: Once fixed, we'll credit you in the release notes (unless you prefer anonymity)

### Severity Ratings

We use standard CVSS scores:

- **Critical** (9.0-10.0): Remote code execution, data breach
- **High** (7.0-8.9): Significant security impact
- **Medium** (4.0-6.9): Moderate security impact
- **Low** (0.1-3.9): Minimal security impact

### Scope

Tailsec scanners analyze code statically. Our scanners:
- Read and parse configuration files
- Do NOT execute code being scanned
- Do NOT make network requests to external services during scan
- Are designed to be safe even when scanning malicious files

However, our scanners may themselves have vulnerabilities. Please report any issues you find.