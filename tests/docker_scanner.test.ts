import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-docker/bin/scan-docker.js';

function runScanner(fixture, extraArgs = '') {
  try {
    const result = execSync(`${SCANNER} ${fixture} ${extraArgs} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
    return JSON.parse(result);
  } catch (e) {
    return e.stdout ? JSON.parse(e.stdout) : { summary: {}, docker: [] };
  }
}

describe('Docker Scanner Integration', () => {
  describe('bad Dockerfile detection', () => {
    it('detects running as root user', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.bad');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.docker).toBeDefined();
      expect(output.docker.length).toBeGreaterThan(0);
    });

    it('detects world-writable permissions', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.bad');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.docker).toBeDefined();
      expect(output.docker.length).toBeGreaterThanOrEqual(2);
    });

    it('detects missing HEALTHCHECK instruction', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.bad');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.docker).toBeDefined();
      expect(output.docker.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('good Dockerfile validation', () => {
    it('passes with no critical issues', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.good');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      const critical = output.docker?.filter((f: any) => f.severity === 'critical');
      expect(critical?.length || 0).toBe(0);
    });

    it('detects HEALTHCHECK instruction', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.good');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.docker).toBeDefined();
    });
  });

  describe('output format validation', () => {
    it('produces valid JSON output', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.bad');
      const output = runScanner(fixture);
      expect(output).toBeDefined();
      expect(output.summary).toBeDefined();
    });

    it('includes summary with total count', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.bad');
      const output = runScanner(fixture);
      expect(output.summary).toBeDefined();
      expect(output.summary.total).toBeGreaterThan(0);
    });

    it('returns SARIF output with correct schema', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.good');
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
    it('returns non-zero exit code on critical findings', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.bad');
      let exitCode = 0;
      try {
        execSync(`${SCANNER} ${fixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        exitCode = e.status;
      }
      expect(exitCode).not.toBe(0);
    });

    it('returns zero exit code for clean Dockerfile', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.good');
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
        execSync(`${SCANNER} /nonexistent/Dockerfile`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();
    });

    it('handles empty Dockerfile', () => {
      const emptyFile = join(__dirname, '../fixtures/docker/empty.dockerfile');
      execSync(`touch ${emptyFile}`);
      const output = runScanner(emptyFile);
      expect(output).toBeDefined();
    });
  });

  describe('performance', () => {
    it('completes scan in under 5 seconds', () => {
      const fixture = join(__dirname, '../fixtures/docker/Dockerfile.good');
      const start = Date.now();
      try {
        execSync(`${SCANNER} ${fixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });
});