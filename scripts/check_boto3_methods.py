#!/usr/bin/env python3
"""Check available boto3 methods for bedrock services"""

import boto3

print("=== Checking boto3 bedrock services ===\n")

# Check bedrock-agent
try:
    client = boto3.client("bedrock-agent", region_name="us-east-1")
    print("bedrock-agent methods:")
    methods = [m for m in dir(client) if not m.startswith("_")]
    for method in sorted(methods):
        if "runtime" in method.lower() or "agent" in method.lower():
            print(f"  - {method}")
except Exception as e:
    print(f"Error with bedrock-agent: {e}")

print()

# Check if there's a bedrock-agentcore service
try:
    client = boto3.client("bedrock-agentcore", region_name="us-east-1")
    print("bedrock-agentcore methods:")
    methods = [m for m in dir(client) if not m.startswith("_")]
    for method in sorted(methods):
        print(f"  - {method}")
except Exception as e:
    print(f"bedrock-agentcore not available: {e}")

print()

# Check bedrock
try:
    client = boto3.client("bedrock", region_name="us-east-1")
    print("bedrock methods:")
    methods = [m for m in dir(client) if not m.startswith("_")]
    for method in sorted(methods):
        if "runtime" in method.lower() or "agent" in method.lower():
            print(f"  - {method}")
except Exception as e:
    print(f"Error with bedrock: {e}")
