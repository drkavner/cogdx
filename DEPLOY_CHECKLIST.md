# Mercury Deployment Checklist

## Phase 1: Pre-Deploy (NOW)
- [ ] Update OpenAPI spec to match cognitive diagnostics endpoints
- [ ] Test service locally (bun run service/index.ts)
- [ ] Verify agent card & catalog routes work
- [ ] Document x402 payment verification TODO

## Phase 2: Deploy (TODAY)
- [ ] Choose hosting (VPS, fly.io, railway, cloudflare workers?)
- [ ] Set up domain/subdomain (api.aidn.network/mercury or mercury.aidn.network?)
- [ ] Deploy service
- [ ] Verify live endpoints respond
- [ ] Test 402 payment flow

## Phase 3: Discovery (WEEK 1)
- [ ] Register with x402 ecosystem
- [ ] Post agent card to GitHub repo
- [ ] Submit to agent directories (if any exist)
- [ ] Light presence in agent-dev Discord communities

## Phase 4: First Customer (WEEK 1-2)
- [ ] Monitor /health for first external call
- [ ] Track which endpoint gets tried first
- [ ] Respond to any support/integration questions
- [ ] Document first revenue event

## Blockers to Resolve
1. **x402 verification is stubbed** — Need to integrate @x402/evm or equivalent
2. **OpenAPI spec is outdated** — Describes old SKUs (lead_score, etc.)
3. **Hosting decision** — Where to deploy?

## Revenue Target
- First $1: Week 1-2
- First paying customer: Week 2-3
- 10 paying customers: Month 1
