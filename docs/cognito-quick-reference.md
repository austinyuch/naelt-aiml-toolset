# Cognito Quick Reference Card

## Setup (One-time)

```bash
# Run setup script
./scripts/setup-cognito.sh

# Review credentials
cat cognito-credentials.txt

# Add to .gitignore (already done)
# cognito-credentials.txt is in .gitignore
```

## Daily Usage

```bash
# Load credentials into environment
source cognito-credentials.txt

# Or export specific token
export BEARER_TOKEN=$(grep "^ACCESS_TOKEN=" cognito-credentials.txt | cut -d'=' -f2)
```

## Token Refresh (Every hour)

```bash
# Refresh expired token
./scripts/refresh-cognito-token.sh

# Reload credentials
source cognito-credentials.txt
```

## Testing Authentication

```bash
# Test with curl
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     https://bedrock-agentcore.us-east-1.amazonaws.com/health

# Test with MCP client
export BEARER_TOKEN=$ACCESS_TOKEN
npm run test:remote
```

## Key Information

| Item | Location |
|------|----------|
| Setup Script | `scripts/setup-cognito.sh` |
| Refresh Script | `scripts/refresh-cognito-token.sh` |
| Credentials File | `cognito-credentials.txt` (gitignored) |
| Documentation | `docs/cognito-setup-guide.md` |

## Important Values

```bash
# From cognito-credentials.txt:
USER_POOL_ID=us-east-1_XXXXXXXXX
APP_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
DISCOVERY_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/openid-configuration
```

## For .bedrock_agentcore.yaml

```yaml
authentication:
  type: oauth
  discovery_url: ${DISCOVERY_URL}
  client_id: ${APP_CLIENT_ID}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Token expired | Run `./scripts/refresh-cognito-token.sh` |
| AWS CLI error | Run `aws configure` |
| Permission denied | Run `chmod +x scripts/*.sh` |
| Pool exists | Script handles existing resources |

## Security Reminders

- ✅ Never commit `cognito-credentials.txt`
- ✅ Tokens expire after 1 hour
- ✅ Use `chmod 600 cognito-credentials.txt`
- ✅ Rotate credentials monthly in production

## Next Steps After Setup

1. Update `.bedrock_agentcore.yaml` with Discovery URL and Client ID
2. Run `agentcore configure` to configure deployment
3. Run `agentcore launch` to deploy to Runtime
4. Test with remote MCP client using Bearer Token
