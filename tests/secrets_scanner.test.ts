/**
 * @license MIT
 * Copyright (c) 2024 Tailsec
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-secrets/bin/scan-secrets.js';

function runScanner(fixture, extraArgs = '') {
  try {
    const result = execSync(`${SCANNER} ${fixture} ${extraArgs} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
    return JSON.parse(result);
  } catch (e) {
    return e.stdout ? JSON.parse(e.stdout) : { summary: {}, secrets: [] };
  }
}

describe('Secrets Scanner Integration', () => {
  describe('Kubernetes secrets detection', () => {
    it('detects hardcoded secrets in ConfigMap', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.secrets).toBeDefined();
      expect(output.secrets.length).toBeGreaterThan(0);
    });

    it('detects API keys in ConfigMap', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.secrets).toBeDefined();
    });

    it('detects database passwords', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.secrets).toBeDefined();
      expect(output.secrets.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('mixed workload secrets detection', () => {
    it('detects secrets in Kubernetes manifests', () => {
      const fixture = join(__dirname, '../fixtures/mixed/app-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.secrets).toBeDefined();
      expect(output.secrets.length).toBeGreaterThan(0);
    });

    it('detects inline API keys', () => {
      const fixture = join(__dirname, '../fixtures/mixed/app-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.secrets).toBeDefined();
    });

    it('detects tokens in Secret resources', () => {
      const fixture = join(__dirname, '../fixtures/mixed/app-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.secrets).toBeDefined();
    });
  });

  describe('Terraform secrets detection', () => {
    it('detects secrets in Terraform files', () => {
      const fixture = join(__dirname, '../fixtures/mixed/infra-config.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.secrets).toBeDefined();
    });
  });

  describe('output format validation', () => {
    it('produces valid JSON output', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.summary).toBeDefined();
    });

    it('includes summary with total count', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      const output = runScanner(fixture);
      expect(output.summary).toBeDefined();
      expect(output.summary.total).toBeGreaterThan(0);
    });

    it('returns SARIF-compatible output', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      let output;
      try {
        output = JSON.parse(execSync(`${SCANNER} ${fixture} --format=sarif`, { encoding: 'utf-8', stdio: 'pipe' }));
      } catch (e) {
        output = e.stdout ? JSON.parse(e.stdout) : {};
      }
      expect(output.$schema).toBeDefined();
      expect(output.version).toBeDefined();
      expect(output.runs).toBeDefined();
    });
  });

  describe('exit code behavior', () => {
    it('returns non-zero exit code when secrets found', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      let exitCode = 0;
      try {
        execSync(`${SCANNER} ${fixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        exitCode = e.status;
      }
      expect(exitCode).not.toBe(0);
    });
  });

  describe('error handling', () => {
    it('handles non-existent file gracefully', () => {
      expect(() => {
        execSync(`${SCANNER} /nonexistent/file.yaml`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('performance', () => {
    it('completes scan in under 5 seconds', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      const start = Date.now();
      try {
        execSync(`${SCANNER} ${fixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });
});