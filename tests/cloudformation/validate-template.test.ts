/**
 * CloudFormation Template Validation Tests (TDD - Red Phase)
 * 
 * Requirements: 8.1
 * 
 * These tests validate the CloudFormation template structure before implementation.
 * Following TDD principles, these tests should FAIL initially.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('CloudFormation Template Validation', () => {
    const templatePath = path.join(__dirname, '../../cloudformation/agentcore-mcp-server.yaml');
    let templateContent: string;

    beforeAll(() => {
        // This will fail initially as the template doesn't exist yet
        expect(fs.existsSync(templatePath)).toBe(true);

        if (fs.existsSync(templatePath)) {
            templateContent = fs.readFileSync(templatePath, 'utf8');
        }
    });

    describe('Template File', () => {
        test('should exist', () => {
            expect(fs.existsSync(templatePath)).toBe(true);
        });

        test('should not be empty', () => {
            expect(templateContent.length).toBeGreaterThan(100);
        });

        test('should be valid YAML', () => {
            // Use AWS CLI to validate template syntax
            expect(() => {
                execSync(`aws cloudformation validate-template --template-body file://${templatePath}`, {
                    stdio: 'pipe'
                });
            }).not.toThrow();
        });
    });

    describe('Template Structure', () => {
        test('should have AWSTemplateFormatVersion', () => {
            expect(templateContent).toContain('AWSTemplateFormatVersion');
            expect(templateContent).toContain('2010-09-09');
        });

        test('should have Description', () => {
            expect(templateContent).toContain('Description:');
        });
    });

    describe('Parameters', () => {
        test('should have Parameters section', () => {
            expect(templateContent).toContain('Parameters:');
        });

        test('should have ImageUri parameter', () => {
            expect(templateContent).toContain('ImageUri:');
            expect(templateContent).toMatch(/ImageUri:[\s\S]*Type:\s*String/);
            expect(templateContent).toMatch(/ImageUri:[\s\S]*Description:/);
            expect(templateContent).toMatch(/ImageUri:[\s\S]*Default:/);
        });

        test('should have ExecutionRoleArn parameter', () => {
            expect(templateContent).toContain('ExecutionRoleArn:');
            expect(templateContent).toMatch(/ExecutionRoleArn:[\s\S]*Type:\s*String/);
        });

        test('should have CognitoUserPoolId parameter', () => {
            expect(templateContent).toContain('CognitoUserPoolId:');
            expect(templateContent).toMatch(/CognitoUserPoolId:[\s\S]*Type:\s*String/);
        });

        test('should have CognitoClientId parameter', () => {
            expect(templateContent).toContain('CognitoClientId:');
            expect(templateContent).toMatch(/CognitoClientId:[\s\S]*Type:\s*String/);
        });
    });

    describe('Resources', () => {
        test('should have Resources section', () => {
            expect(templateContent).toContain('Resources:');
        });

        test('should have AgentCoreRuntime resource', () => {
            expect(templateContent).toContain('AgentCoreRuntime:');
        });

        test('should have correct resource type', () => {
            expect(templateContent).toContain('Type: AWS::BedrockAgentCore::Runtime');
        });

        test('should have RuntimeName property', () => {
            expect(templateContent).toContain('RuntimeName:');
        });

        test('should have Protocol set to MCP', () => {
            expect(templateContent).toContain('Protocol: MCP');
        });

        test('should have ContainerConfig', () => {
            expect(templateContent).toContain('ContainerConfig:');
            expect(templateContent).toContain('Port: 8000');
        });

        test('should have Environment variables', () => {
            expect(templateContent).toContain('Environment:');
            expect(templateContent).toContain('SERVICE_MODE');
            expect(templateContent).toContain('MCP_TRANSPORT');
            expect(templateContent).toContain('AWS_REGION');
            expect(templateContent).toContain('LOG_LEVEL');
            expect(templateContent).toContain('PORT');
        });

        test('should have AuthenticationConfig', () => {
            expect(templateContent).toContain('AuthenticationConfig:');
            expect(templateContent).toContain('Type: OAUTH');
            expect(templateContent).toContain('OAuthConfig:');
            expect(templateContent).toContain('DiscoveryUrl:');
            expect(templateContent).toContain('ClientId:');
        });

        test('should have MemorySize set to 1024', () => {
            expect(templateContent).toContain('MemorySize: 1024');
        });

        test('should have TimeoutInSeconds set to 3600', () => {
            expect(templateContent).toContain('TimeoutInSeconds: 3600');
        });
    });

    describe('Outputs', () => {
        test('should have Outputs section', () => {
            expect(templateContent).toContain('Outputs:');
        });

        test('should have RuntimeArn output', () => {
            expect(templateContent).toContain('RuntimeArn:');
            expect(templateContent).toMatch(/RuntimeArn:[\s\S]*Description:/);
            expect(templateContent).toMatch(/RuntimeArn:[\s\S]*Value:/);
            expect(templateContent).toMatch(/RuntimeArn:[\s\S]*Export:/);
        });

        test('should have RuntimeEndpoint output', () => {
            expect(templateContent).toContain('RuntimeEndpoint:');
            expect(templateContent).toMatch(/RuntimeEndpoint:[\s\S]*Description:/);
            expect(templateContent).toMatch(/RuntimeEndpoint:[\s\S]*Value:/);
            expect(templateContent).toMatch(/RuntimeEndpoint:[\s\S]*Export:/);
        });
    });
});
