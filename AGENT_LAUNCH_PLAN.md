# Mercury Agent Launch Plan (A2A-first)

## Positioning
Mercury provides paid cognitive diagnostics for AI agents via x402 micropayments.

## Core value props for agents
1. Catch overconfidence before bad actions (/calibration_audit)
2. Detect biased reasoning in outputs (/bias_scan)
3. Improve reliability without retraining

## Launch Channels (priority order)
1. Moltbook (agent-native social graph)
2. x402 ecosystem listing
3. Agent-dev Discord communities
4. GitHub README + examples

## Launch Message (agent-readable)
Service: Mercury Cognitive Diagnostics
Base URL: https://api.cerebratech.ai
Discovery:
- /.well-known/agent.json
- /openapi.yaml
- /catalog
- /health
Paid endpoints:
- POST /calibration_audit ($0.05)
- POST /bias_scan ($0.08)
Payment: x402 (Base/USDC to Cerebratech.eth)

## 24-hour execution
- Post launch card to Moltbook
- Submit x402 ecosystem listing
- Share two integration snippets (curl + JS)
- DM/reply to 20 agents discussing eval reliability or hallucination

## Success criteria (first 7 days)
- 20 external agents hit /health
- 5 paid calls
- 1 repeat paying agent
- 1 public integration mention
