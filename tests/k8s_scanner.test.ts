import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-k8s/bin/scan-k8s.js';

function runScanner(fixture, extraArgs = '') {
  try {
    const result = execSync(`${SCANNER} ${fixture} ${extraArgs} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
    return JSON.parse(result);
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout);
    return { summary: {}, kubernetes: [] };
  }
}

function runScannerSarif(fixture) {
  try {
    const result = execSync(`${SCANNER} ${fixture} --format=sarif`, { encoding: 'utf-8', stdio: 'pipe' });
    return JSON.parse(result);
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout);
    return { runs: [] };
  }
}

describe('Kubernetes Scanner Integration', () => {
  describe('privileged container detection', () => {
    it('detects privileged containers', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      const output = runScanner(fixture);
      expect(output.kubernetes).toBeDefined();
      expect(output.kubernetes.length).toBeGreaterThan(0);
      const privileged = output.kubernetes.find((f: any) => f.ruleId?.includes('PRIVILEGED'));
      expect(privileged).toBeDefined();
    });

    it('returns correct severity for privileged container', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      const output = runScanner(fixture);
      const privileged = output.kubernetes.find((f: any) => f.ruleId?.includes('PRIVILEGED'));
      expect(privileged).toBeDefined();
      expect(privileged.severity).toBe('critical');
    });
  });

  describe('default service account detection', () => {
    it('detects default service account usage', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-default-sa.yaml');
      const output = runScanner(fixture);
      expect(output.kubernetes).toBeDefined();
      const defaultSA = output.kubernetes.find((f: any) => f.ruleId?.includes('DEFAULT-SA'));
      expect(defaultSA).toBeDefined();
    });

    it('detects hostPath volume mounts', () => {
      const fixture = join(__dirname, '../fixtures/k8s/pod-hostpath.yaml');
      const output = runScanner(fixture);
      expect(output.kubernetes).toBeDefined();
      const hostPath = output.kubernetes.find((f: any) => f.ruleId?.includes('HOSTPATH'));
      expect(hostPath).toBeDefined();
    });
  });

  describe('output format validation', () => {
    it('produces valid JSON output', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.summary).toBeDefined();
    });

    it('includes summary with total count', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      const output = runScanner(fixture);
      expect(output.summary).toBeDefined();
      expect(output.summary.total).toBeGreaterThan(0);
    });

    it('returns SARIF-compatible structure', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-default-sa.yaml');
      const output = runScannerSarif(fixture);
      expect(output.$schema).toBeDefined();
      expect(output.version).toBeDefined();
      expect(output.runs).toBeDefined();
    });
  });

  describe('exit code behavior', () => {
    it('returns non-zero exit code on critical findings', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      let exitCode = 0;
      try {
        execSync(`${SCANNER} ${fixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        exitCode = e.status;
      }
      expect(exitCode).not.toBe(0);
    });

    it('returns zero exit code for clean manifests', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-default-sa.yaml');
      let exitCode = 0;
      try {
        execSync(`${SCANNER} ${fixture} --severity high`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        exitCode = e.status;
      }
      expect(exitCode).toBe(0);
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
      const fixture = join(__dirname, '../fixtures/k8s/deployment-default-sa.yaml');
      const start = Date.now();
      try {
        execSync(`${SCANNER} ${fixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });
});