# Tailsec Integration Tests

Comprehensive integration test suite for the Tailsec scanner ecosystem.

## Overview

This test suite validates that all Tailsec scanners work correctly together and against real-world configurations. It covers Kubernetes, Terraform, Docker, and secrets scanning with various security configurations.

## Structure

```
integration-tests/
├── fixtures/           # Test fixtures with known security issues
│   ├── k8s/           # Kubernetes manifests
│   ├── terraform/      # Terraform configurations
│   ├── docker/         # Dockerfile samples
│   └── mixed/          # Multi-format configurations
├── tests/             # Integration tests
│   ├── k8s_scanner.test.ts
│   ├── terraform_scanner.test.ts
│   ├── docker_scanner.test.ts
│   ├── secrets_scanner.test.ts
│   └── end_to_end.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Running Tests

```bash
npm install
npm test
```

## Scanners

- `@tailsec/scan-k8s` - Kubernetes security scanner
- `@tailsec/scan-terraform` - Terraform security scanner
- `@tailsec/scan-docker` - Docker security scanner
- `@tailsec/scan-secrets` - Secrets detection scanner

## Test Categories

1. **Individual Scanner Tests** - Each scanner tested against known-vulnerable fixtures
2. **Exit Code Tests** - Critical findings produce non-zero exit codes
3. **Output Format Tests** - JSON SARIF output format validation
4. **Error Handling Tests** - Graceful handling of invalid files
5. **Performance Tests** - Each scan completes in < 5 seconds
6. **End-to-End Tests** - Multi-scanner workflows and CI/CD simulations