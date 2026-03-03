# Consensus Verification Oracle
## Product Specification v0.1

### Vision
A trust layer for agent-generated knowledge. Not "we say it's true" — but "independent verification reached X% consensus."

---

### Core Principle
Truth emerges from consensus across **independent** information streams. Independence is key — correlated sources don't add epistemic value.

---

### Endpoint: `/verify_consensus`

**Request:**
```json
{
  "agent_id": "string",
  "claim": "string (the factual claim to verify)",
  "context": "string (optional context for disambiguation)",
  "verification_depth": "quick | standard | deep",
  "min_sources": 3,
  "require_independence": true
}
```

**Response:**
```json
{
  "claim": "string",
  "consensus_level": 0.0-1.0,
  "confidence": "high | medium | low | insufficient",
  "verdict": "verified | contested | refuted | unverifiable",
  "sources": [
    {
      "source_id": "string",
      "source_type": "search | database | api | model",
      "independence_score": 0.0-1.0,
      "agrees": true | false | null,
      "evidence": "string",
      "retrieval_timestamp": "ISO8601"
    }
  ],
  "disagreements": [
    {
      "source_a": "string",
      "source_b": "string", 
      "nature": "factual | interpretive | scope",
      "details": "string"
    }
  ],
  "epistemic_status": {
    "label": "verified | likely_true | uncertain | likely_false | false | unverifiable",
    "reasoning": "string"
  },
  "methodology": "string",
  "cost": "$X.XX"
}
```

---

### Independence Architecture

**Source Categories (must use multiple categories for true independence):**

1. **Search-grounded sources**
   - Web search APIs (multiple providers)
   - News aggregators
   - Academic search (Semantic Scholar, etc.)

2. **Structured databases**
   - Wikidata / Wikipedia
   - Government databases
   - Domain-specific knowledge bases

3. **Model-based verification** (different architectures)
   - GPT-family
   - Claude-family  
   - Gemini-family
   - Open-source models (Llama, Mistral)

4. **Specialized fact-checkers**
   - Snopes API (if available)
   - PolitiFact
   - Domain-specific validators

**Independence scoring:**
- Same provider family = low independence (0.2)
- Same training data likely = medium independence (0.5)
- Different architecture + different data = high independence (0.8+)

---

### Verification Depth Tiers

| Tier | Sources | Latency | Price |
|------|---------|---------|-------|
| quick | 3 sources, 1 category | <5s | $0.05 |
| standard | 5 sources, 2+ categories | <15s | $0.15 |
| deep | 7+ sources, 3+ categories | <60s | $0.35 |

---

### Consensus Calculation

```
consensus_level = weighted_agreement / total_weight

where:
- weight = source_independence_score * source_reliability_score
- agreement = 1 if agrees, 0 if disagrees, 0.5 if uncertain
```

**Confidence thresholds:**
- high: consensus >= 0.85 with 5+ independent sources
- medium: consensus >= 0.70 with 3+ independent sources  
- low: consensus >= 0.50 or <3 sources
- insufficient: <3 sources responded

---

### Epistemic Status Labels

| Label | Meaning |
|-------|---------|
| verified | High consensus (>0.85), multiple independent sources agree |
| likely_true | Medium-high consensus (0.70-0.85) |
| uncertain | Mixed signals, sources disagree, or insufficient data |
| likely_false | Medium-high consensus that claim is false |
| false | High consensus claim is false |
| unverifiable | Claim cannot be checked (opinion, future prediction, etc.) |

---

### Edge Cases

1. **Unfalsifiable claims** → Return "unverifiable" with explanation
2. **Opinion vs fact** → Detect and flag ("This appears to be an opinion, not a factual claim")
3. **Outdated information** → Include temporal context ("True as of X date, may have changed")
4. **Ambiguous claims** → Request clarification or return multiple interpretations

---

### Implementation Phases

**Phase 1: MVP**
- Web search grounding (1 provider)
- 2 model-based verifiers
- Basic consensus calculation
- `/verify_consensus` endpoint live

**Phase 2: Independence expansion**
- Multiple search providers
- Structured database integration
- Independence scoring

**Phase 3: Deep verification**
- Academic source integration
- Specialized fact-checker APIs
- Temporal tracking (claim status over time)

---

### Pricing Strategy

- Higher than bias scan (more compute, external API costs)
- Tiered by depth
- Volume discounts for high-usage agents
- Position as premium "truth layer"

---

### Competitive Moat

1. **Independence-first architecture** — Not just "ask GPT if it's true"
2. **Epistemic rigor** — Proper uncertainty quantification
3. **Agent-native interface** — Designed for machine consumption
4. **Audit trail** — Full source attribution for transparency

---

### Integration with Existing Products

- `/calibration_audit` → Checks confidence calibration
- `/bias_scan` → Checks reasoning patterns
- `/verify_consensus` → Checks factual accuracy
- `/feedback` → Improves all of the above

**Full cognitive stack:** Calibration + Bias + Truth verification
