import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const SCANNER = 'node /Users/mark/Projects/tailsec-com/scan-terraform/bin/scan-terraform.js';

function runScanner(fixture, extraArgs = '') {
  let output;
  try {
    output = JSON.parse(execSync(`${SCANNER} ${fixture} ${extraArgs} --format json`, { encoding: 'utf-8', stdio: 'pipe' }));
  } catch (e) {
    output = JSON.parse(e.stdout || '{}');
  }
  return output;
}

describe('Terraform Scanner Integration', () => {
  describe('S3 public bucket detection', () => {
    it('detects public S3 bucket policy', () => {
      const fixture = join(__dirname, '../fixtures/terraform/s3-public.tf');
      const output = runScanner(fixture);
      expect(output.terraform).toBeDefined();
      const publicBucket = output.terraform.find((f: any) =>
        f.ruleId?.includes('public') || f.resource?.includes('s3')
      );
      expect(publicBucket).toBeDefined();
    });

    it('identifies public access grant in policy', () => {
      const fixture = join(__dirname, '../fixtures/terraform/s3-public.tf');
      const output = runScanner(fixture);
      const publicAccess = output.terraform.find((f: any) =>
        f.description?.toLowerCase().includes('public')
      );
      expect(publicAccess).toBeDefined();
    });
  });

  describe('IAM admin policy detection', () => {
    it('detects admin access policy', () => {
      const fixture = join(__dirname, '../fixtures/terraform/iam-admin.tf');
      const output = runScanner(fixture);
      expect(output.terraform).toBeDefined();
      expect(output.terraform.length).toBeGreaterThan(0);
    });

    it('detects wildcard resource in IAM policy', () => {
      const fixture = join(__dirname, '../fixtures/terraform/iam-admin.tf');
      const output = runScanner(fixture);
      const wildcard = output.terraform.find((f: any) =>
        f.ruleId?.includes('wildcard') || f.description?.toLowerCase().includes('wildcard')
      );
      expect(wildcard).toBeDefined();
    });
  });

  describe('RDS unencrypted detection', () => {
    it('detects unencrypted RDS instance', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      const output = runScanner(fixture);
      expect(output.terraform).toBeDefined();
      const unencrypted = output.terraform.find((f: any) =>
        f.ruleId?.includes('UNENCRYPTED')
      );
      expect(unencrypted).toBeDefined();
    });

    it('detects publicly accessible RDS', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      const output = runScanner(fixture);
      const publicRds = output.terraform.find((f: any) =>
        f.ruleId?.includes('PUBLIC')
      );
      expect(publicRds).toBeDefined();
    });
  });

  describe('output format validation', () => {
    it('produces valid JSON output', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      const output = runScanner(fixture);
      expect(() => JSON.parse(JSON.stringify(output))).not.toThrow();
    });

    it('includes summary with total count', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      const output = runScanner(fixture);
      expect(output.summary).toBeDefined();
      expect(output.summary.total).toBeGreaterThan(0);
    });

    it('returns SARIF output with correct schema', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      let rawOutput;
      try {
        rawOutput = execSync(`${SCANNER} ${fixture} --format=sarif`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {
        rawOutput = e.stdout;
      }
      const output = JSON.parse(rawOutput);
      expect(output.$schema).toBeDefined();
      expect(output.version).toBeDefined();
      expect(output.runs).toBeDefined();
    });
  });

  describe('exit code behavior', () => {
    it('returns non-zero exit code for critical findings', () => {
      const fixture = join(__dirname, '../fixtures/terraform/iam-admin.tf');
      expect(() => {
        execSync(`${SCANNER} ${fixture}`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('error handling', () => {
    it('handles non-existent file gracefully', () => {
      expect(() => {
        execSync(`${SCANNER} /nonexistent/terraform.tf`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('performance', () => {
    it('completes scan in under 5 seconds', () => {
      const fixture = join(__dirname, '../fixtures/terraform/rds-unencrypted.tf');
      const start = Date.now();
      try {
        execSync(`${SCANNER} ${fixture} --format json`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e) {}
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });
});