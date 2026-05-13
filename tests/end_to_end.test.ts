import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const K8S_SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-k8s/bin/scan-k8s.js';
const TERRAFORM_SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-terraform/bin/scan-terraform.js';
const DOCKER_SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-docker/bin/scan-docker.js';
const SECRETS_SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-secrets/bin/scan-secrets.js';

function runScanner(scanner, fixture, extraArgs = '') {
  let output;
  try {
    output = JSON.parse(execSync(`${scanner} ${fixture} ${extraArgs} --format json`, { encoding: 'utf-8', stdio: 'pipe' }));
  } catch (e) {
    output = JSON.parse(e.stdout || '{}');
  }
  return output;
}

function runScannerSarif(scanner, fixture) {
  let output;
  try {
    output = JSON.parse(execSync(`${scanner} ${fixture} --format=sarif`, { encoding: 'utf-8', stdio: 'pipe' }));
  } catch (e) {
    output = JSON.parse(e.stdout || '{}');
  }
  return output;
}

describe('End-to-End Integration Tests', () => {
  describe('multi-scanner workflow', () => {
    it('runs all scanners on mixed configuration', () => {
      const mixedDir = join(__dirname, '../fixtures/mixed');

      const k8sOutput = runScanner(K8S_SCANNER, `${mixedDir}/app-with-secrets.yaml`);
      const tfOutput = runScanner(TERRAFORM_SCANNER, `${mixedDir}/infra-config.yaml`);

      expect(k8sOutput.summary).toBeDefined();
      expect(tfOutput.summary).toBeDefined();
    });

    it('correlates findings across scanners', () => {
      const appFixture = join(__dirname, '../fixtures/mixed/app-with-secrets.yaml');
      const secretsOutput = runScanner(SECRETS_SCANNER, appFixture);
      const k8sOutput = runScanner(K8S_SCANNER, appFixture);

      expect(secretsOutput.secrets.length).toBeGreaterThan(0);
      expect(k8sOutput.kubernetes.length).toBeGreaterThan(0);
    });
  });

  describe('CI/CD pipeline simulation', () => {
    it('blocks deployment on critical findings', () => {
      const privilegedFixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');

      let exitCode = 0;
      try {
        execSync(`${K8S_SCANNER} ${privilegedFixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        exitCode = e.status;
      }

      expect(exitCode).not.toBe(0);
    });

    it('allows deployment when no critical issues', () => {
      const goodDockerfile = join(__dirname, '../fixtures/docker/Dockerfile.good');

      let exitCode = 0;
      try {
        execSync(`${DOCKER_SCANNER} ${goodDockerfile} --severity high`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        exitCode = e.status;
      }

      expect(exitCode).toBe(0);
    });
  });

  describe('report generation', () => {
    it('generates combined SARIF report', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      const output = runScannerSarif(K8S_SCANNER, fixture);

      expect(output.runs).toBeDefined();
      expect(output.runs[0].results).toBeDefined();
      expect(output.runs[0].results.length).toBeGreaterThan(0);
    });

    it('includes tool information in SARIF output', () => {
      const fixture = join(__dirname, '../fixtures/terraform/s3-public.tf');
      const output = runScannerSarif(TERRAFORM_SCANNER, fixture);

      expect(output.runs[0].tool.driver.name).toBe('@tailsec/scan-terraform');
      expect(output.runs[0].tool.driver.version).toBeDefined();
    });

    it('produces JSON output with proper structure', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.good');
      const output = runScanner(DOCKER_SCANNER, fixture);

      expect(output).toHaveProperty('summary');
      expect(output).toHaveProperty('docker');
      expect(output.summary).toHaveProperty('total');
      expect(output.summary).toHaveProperty('critical');
      expect(output.summary).toHaveProperty('high');
      expect(output.summary).toHaveProperty('medium');
      expect(output.summary).toHaveProperty('low');
    });
  });

  describe('performance across scanners', () => {
    it('completes K8s scan in under 5 seconds', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-default-sa.yaml');
      const start = Date.now();
      try {
        execSync(`${K8S_SCANNER} ${fixture} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      expect(Date.now() - start).toBeLessThan(5000);
    });

    it('completes Terraform scan in under 5 seconds', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      const start = Date.now();
      try {
        execSync(`${TERRAFORM_SCANNER} ${fixture} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      expect(Date.now() - start).toBeLessThan(5000);
    });

    it('completes Docker scan in under 5 seconds', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.good');
      const start = Date.now();
      try {
        execSync(`${DOCKER_SCANNER} ${fixture} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      expect(Date.now() - start).toBeLessThan(5000);
    });

    it('completes Secrets scan in under 5 seconds', () => {
      const fixture = join(__dirname, '../fixtures/k8s/configmap-with-secrets.yaml');
      const start = Date.now();
      try {
        execSync(`${SECRETS_SCANNER} ${fixture} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      expect(Date.now() - start).toBeLessThan(5000);
    });
  });

  describe('boundary conditions', () => {
    it('handles empty input files', () => {
      const emptyFile = join(__dirname, '../fixtures/docker/empty.dockerfile');
      execSync(`touch ${emptyFile}`);
      let exitCode = 0;
      try {
        execSync(`${DOCKER_SCANNER} ${emptyFile}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        exitCode = e.status;
      }
      expect(exitCode).toBe(0);
    });

    it('handles deeply nested YAML structures', () => {
      const fixture = join(__dirname, '../fixtures/k8s/pod-hostpath.yaml');
      const output = runScanner(K8S_SCANNER, fixture);
      expect(output.summary).toBeDefined();
    });

    it('handles multiple resources in single file', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      const output = runScanner(K8S_SCANNER, fixture);
      expect(output.kubernetes.length).toBeGreaterThan(0);
    });
  });

  describe('security regression detection', () => {
    it('detects privilege escalation patterns', () => {
      const fixture = join(__dirname, '../fixtures/k8s/deployment-privileged.yaml');
      const output = runScanner(K8S_SCANNER, fixture);

      const privileged = output.kubernetes.find((f: any) => f.severity === 'critical');
      expect(privileged).toBeDefined();
    });

    it('detects network exposure risks', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      const output = runScanner(TERRAFORM_SCANNER, fixture);

      const networkRisk = output.terraform.find((f: any) =>
        f.description?.toLowerCase().includes('public')
      );
      expect(networkRisk).toBeDefined();
    });
  });
});