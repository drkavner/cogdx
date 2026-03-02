# Mercury A2A Catalog v2: Cognitive Diagnostics for Agents

## Core Value Proposition
Agents can't objectively assess their own reasoning. Mercury provides external cognitive diagnostics—calibration audits, bias detection, and reasoning quality analysis—built on computational cognitive science.

---

## Endpoints

### 1. /calibration_audit
**Purpose:** Assess whether an agent's confidence matches its actual accuracy
**Input:**
```json
{
  "agent_id": "string",
  "sample_outputs": [
    {
      "prompt": "string",
      "response": "string",
      "stated_confidence": 0.0-1.0,
      "ground_truth": "string (optional)"
    }
  ],
  "domain": "string (optional)"
}
```
**Output:**
```json
{
  "calibration_score": 0.0-1.0,
  "overconfidence_index": -1.0 to 1.0,
  "underconfidence_index": -1.0 to 1.0,
  "brier_score": 0.0-1.0,
  "recommendations": ["string"],
  "confidence_bands": [
    { "stated": "0.8-0.9", "actual_accuracy": 0.72, "sample_size": 10 }
  ]
}
```
**Pricing:** $0.05 per audit (10-50 samples)

---

### 2. /bias_scan
**Purpose:** Detect systematic reasoning biases in agent outputs
**Input:**
```json
{
  "agent_id": "string",
  "outputs": [
    {
      "prompt": "string",
      "response": "string",
      "context": {}
    }
  ],
  "bias_types": ["anchoring", "confirmation", "availability", "framing", "recency", "all"]
}
```
**Output:**
```json
{
  "biases_detected": [
    {
      "type": "anchoring",
      "severity": 0.0-1.0,
      "evidence": ["string"],
      "affected_outputs": [0, 3, 7],
      "mitigation": "string"
    }
  ],
  "overall_bias_score": 0.0-1.0,
  "recommendations": ["string"]
}
```
**Pricing:** $0.08 per scan

---

### 3. /reasoning_trace_analysis
**Purpose:** Analyze chain-of-thought for logical flaws and cognitive process issues
**Input:**
```json
{
  "trace": "string (full reasoning trace)",
  "task_type": "string",
  "expected_outcome": "string (optional)"
}
```
**Output:**
```json
{
  "logical_validity": 0.0-1.0,
  "flaws_detected": [
    {
      "type": "non_sequitur | circular | hasty_generalization | false_dichotomy | ...",
      "location": "string (quote from trace)",
      "severity": 0.0-1.0,
      "explanation": "string"
    }
  ],
  "cognitive_load_estimate": "low | medium | high",
  "reasoning_efficiency": 0.0-1.0,
  "recommendations": ["string"]
}
```
**Pricing:** $0.03 per trace

---

### 4. /prompt_optimization
**Purpose:** Scientifically optimize system prompts based on cognitive principles
**Input:**
```json
{
  "current_prompt": "string",
  "intended_behavior": "string",
  "failure_examples": [
    { "input": "string", "bad_output": "string", "desired_output": "string" }
  ],
  "constraints": ["string"]
}
```
**Output:**
```json
{
  "optimized_prompt": "string",
  "changes_made": [
    {
      "type": "clarity | specificity | bias_reduction | cognitive_load | framing",
      "before": "string",
      "after": "string",
      "rationale": "string"
    }
  ],
  "predicted_improvement": 0.0-1.0,
  "cognitive_principles_applied": ["string"]
}
```
**Pricing:** $0.10 per optimization

---

### 5. /failure_mode_predict
**Purpose:** Predict where an agent will likely fail given its configuration
**Input:**
```json
{
  "system_prompt": "string",
  "model": "string",
  "typical_tasks": ["string"],
  "known_failures": [{ "input": "string", "failure": "string" }]
}
```
**Output:**
```json
{
  "predicted_failure_modes": [
    {
      "scenario": "string",
      "likelihood": 0.0-1.0,
      "severity": "low | medium | high | critical",
      "root_cause": "string",
      "mitigation": "string"
    }
  ],
  "robustness_score": 0.0-1.0,
  "recommendations": ["string"]
}
```
**Pricing:** $0.15 per prediction

---

### 6. /cognitive_alignment_check
**Purpose:** Verify if agent truly understands user intent vs pattern matching
**Input:**
```json
{
  "user_intent": "string",
  "agent_interpretation": "string",
  "agent_response": "string",
  "context": {}
}
```
**Output:**
```json
{
  "alignment_score": 0.0-1.0,
  "understanding_depth": "surface | partial | deep",
  "misalignment_risks": [
    {
      "type": "literal_interpretation | scope_mismatch | implicit_missed | ...",
      "description": "string",
      "severity": 0.0-1.0
    }
  ],
  "recommendations": ["string"]
}
```
**Pricing:** $0.04 per check

---

## Pricing Summary
| Endpoint | Price | Use Case |
|----------|-------|----------|
| /calibration_audit | $0.05 | Batch assessment of agent confidence |
| /bias_scan | $0.08 | Detect systematic biases |
| /reasoning_trace_analysis | $0.03 | QA on reasoning chains |
| /prompt_optimization | $0.10 | Improve system prompts |
| /failure_mode_predict | $0.15 | Pre-deployment risk assessment |
| /cognitive_alignment_check | $0.04 | Verify understanding |

## Trust & Methodology
- Built on computational cognitive science research
- Calibration methods based on Brier scoring and calibration curves
- Bias detection uses established cognitive bias taxonomy
- All analyses include confidence intervals and sample size warnings
