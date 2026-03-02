# A2A Service Catalog v1

## Endpoints for Agent Consumption

### 1. /lead_score
**Purpose:** Score a lead for conversion likelihood
**Input:** `{ "lead_data": { "source": "string", "signals": [], "context": {} } }`
**Output:** `{ "score": 0-100, "confidence": 0-1, "factors": [] }`
**Pricing:** $0.002 per call

### 2. /offer_generator
**Purpose:** Generate a contextual offer for a prospect
**Input:** `{ "prospect_profile": {}, "product_context": {}, "constraints": {} }`
**Output:** `{ "offer_text": "string", "variants": [], "confidence": 0-1 }`
**Pricing:** $0.005 per call

### 3. /content_angle_rank
**Purpose:** Rank content angles by expected performance
**Input:** `{ "topic": "string", "audience": {}, "angles": [] }`
**Output:** `{ "ranked_angles": [{ "angle": "", "score": 0-100, "reasoning": "" }] }`
**Pricing:** $0.003 per call

### 4. /close_message_draft
**Purpose:** Draft async close message for a warm lead
**Input:** `{ "lead_context": {}, "conversation_history": [], "goal": "string" }`
**Output:** `{ "message": "string", "follow_up_timing": "", "confidence": 0-1 }`
**Pricing:** $0.004 per call

### 5. /trend_signal
**Purpose:** Detect emerging trends in a domain
**Input:** `{ "domain": "string", "timeframe": "24h|7d|30d", "sources": [] }`
**Output:** `{ "signals": [{ "trend": "", "strength": 0-1, "evidence": [] }] }`
**Pricing:** $0.01 per call

## Trust & Verification
- All endpoints return `trust_score` in response headers
- Calls are logged with agent-id for audit
- SLA: 99.5% uptime, <500ms p95 latency

## Payment
- x402 compatible
- Pre-paid credits or per-call billing
- Minimum: $0.10 per session

## Discovery
- Published to AIDN agent registry
- OpenAPI spec available at /a2a/openapi.json
- Agent card at /a2a/agent.json
