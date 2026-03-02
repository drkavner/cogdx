# Mercury Pipeline - Cognitive Diagnostics for Agents

## Mission
Provide cognitive diagnostics that agents can't do for themselves: calibration audits, bias detection, reasoning analysis. Built on computational cognitive science expertise.

## Active Work

### Phase 1: Foundation ✓
- [x] Define cognitive diagnostics catalog (6 endpoints)
- [x] Design agent card for discovery
- [x] x402 payment integration (Cerebratech.eth)

### Phase 2: Build Endpoints
- [x] `/calibration_audit` - LIVE (Brier scores, calibration curves)
- [x] `/bias_scan` - LIVE (Cognitive + Statistical modes)
- [ ] `/reasoning_trace_analysis` - stub
- [ ] `/prompt_optimization` - stub
- [ ] `/failure_mode_predict` - stub
- [ ] `/cognitive_alignment_check` - stub

### Phase 3: Deploy & Discover
- [ ] Deploy to production URL
- [ ] Real x402 verification (@x402/evm)
- [ ] Register in agent discovery
- [ ] First agent customer

## Endpoint Status
| Endpoint | Price | Status | Methodology |
|----------|-------|--------|-------------|
| /calibration_audit | $0.05 | ✓ LIVE | Brier scores, calibration curves |
| /bias_scan | $0.08 | ✓ LIVE | Kahneman+Tversky + Fairness metrics |
| /reasoning_trace_analysis | $0.03 | stub | — |
| /prompt_optimization | $0.10 | stub | — |
| /failure_mode_predict | $0.15 | stub | — |
| /cognitive_alignment_check | $0.04 | stub | — |

## Configuration
- Payment: Cerebratech.eth (Base/USDC)
- Protocol: x402
- Port: 3100

## Key Research Integrated
- Wang & Redelmeier (2024): Forewarning AI about cognitive biases
- Kahneman & Tversky (1974): Heuristics and biases
- IBM AI Fairness 360: Statistical fairness metrics
- PRIOR Framework: Inference-level vulnerabilities

## Files
- A2A_CATALOG_V2.md - Cognitive diagnostics catalog
- A2A_AGENT_CARD.json - Discovery card
- BIAS_METHODOLOGY.md - Research-backed methodology
- service/index.ts - Main service
- service/calibration.ts - Calibration audit
- service/bias_scan.ts - Unified bias detection

## Metrics
- Live endpoints: 2/6
- Agent customers: 0
- Calls processed: 0
- Revenue: $0

## Last Updated
2026-03-02 13:20 EST
