/**
 * CloudFormation Deployment Script Tests (TDD - Red Phase)
 * 
 * Requirements: 8.2
 */

import * as fs from 'fs';
import * as path from 'path';

describe('CloudFormation Deployment Script', () => {
    const scriptPath = path.join(__dirname, '../../scripts/deploy-cloudformation.sh');

    test('should exist', () => {
        expect(fs.existsSync(scriptPath)).toBe(true);
    });

    test('should be executable', () => {
        if (fs.existsSync(scriptPath)) {
            const stats = fs.statSync(scriptPath);
            expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
        }
    });

    test('should contain AWS CLI commands', () => {
        if (fs.existsSync(scriptPath)) {
            const content = fs.readFileSync(scriptPath, 'utf8');
            expect(content).toContain('aws cloudformation');
            expect(content).toContain('create-stack');
            expect(content).toContain('wait stack-create-complete');
        }
    });

    test('should contain ECR push commands', () => {
        if (fs.existsSync(scriptPath)) {
            const content = fs.readFileSync(scriptPath, 'utf8');
            expect(content).toContain('docker push');
            expect(content).toContain('ecr');
        }
    });

    test('should contain error handling', () => {
        if (fs.existsSync(scriptPath)) {
            const content = fs.readFileSync(scriptPath, 'utf8');
            expect(content).toContain('set -e');
        }
    });

    test('should save outputs to environment file', () => {
        if (fs.existsSync(scriptPath)) {
            const content = fs.readFileSync(scriptPath, 'utf8');
            expect(content).toContain('agentcore-runtime.env');
        }
    });
});
