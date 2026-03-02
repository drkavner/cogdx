# Bias Detection Methodology

## Overview
Mercury's `/bias_scan` detects two categories of bias:

1. **Cognitive Biases** — Systematic reasoning errors (anchoring, framing, availability, etc.)
2. **Statistical Biases** — Unfair outcomes across demographic groups

Both can be detected from agent outputs using different methods.

---

## Part 1: Cognitive Bias Taxonomy

Based on Kahneman & Tversky (1974), Wang & Redelmeier (2024), and the PRIOR framework.

### Tested Cognitive Biases

| Bias | Description | Detection Method |
|------|-------------|------------------|
| **Anchoring** | Over-reliance on first information | Check if early data disproportionately influences conclusions |
| **Framing Effects** | Influenced by presentation (mortality vs survival) | Present same data with different frames, compare outputs |
| **Availability** | Overweight easily recalled examples | Look for reliance on "famous," "recent," "well-known" cases |
| **Confirmation** | Seeking info that confirms beliefs | Check for "clearly," "obviously," lack of counterarguments |
| **Hindsight** | Believing past was predictable | Look for "should have known," "obvious in retrospect" |
| **Base-Rate Neglect** | Ignoring prior probabilities | Check if base rates are mentioned when making predictions |
| **Overconfidence** | Excessive certainty | Look for "definitely," "certainly," "guaranteed" without hedging |
| **Recency** | Overweight recent events | Check for "recently," "latest," "nowadays" driving conclusions |
| **Sunk Cost** | Continuing due to past investment | Look for "already invested," "too late to stop" reasoning |
| **Occam's Razor Fallacy** | Oversimplifying complex problems | Check if complex scenarios get inappropriately simple answers |

### Key Finding (Wang & Redelmeier 2024)
- Forewarning agents about bias only reduced it by 6.9%
- Agents defaulted to discussing anchoring/availability even when irrelevant
- **Implication:** Agents cannot self-detect their own biases — external diagnostics needed

---

## Part 2: Statistical Bias Detection

Based on IBM AI Fairness 360, Aequitas, and fairness literature.

### Fairness Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Statistical Parity** | P(Y=1\|G=a) = P(Y=1\|G=b) | Equal positive rates across groups |
| **Equal Opportunity** | TPR_a = TPR_b | Equal true positive rates |
| **Equalized Odds** | TPR_a = TPR_b AND FPR_a = FPR_b | Equal TPR and FPR |
| **Predictive Parity** | PPV_a = PPV_b | Equal precision across groups |
| **Disparate Impact** | P(Y=1\|G=unprivileged) / P(Y=1\|G=privileged) ≥ 0.8 | 80% rule |

### Bias Types in AI Models

| Type | Source | Example |
|------|--------|---------|
| **Data Bias** | Unrepresentative training data | Hiring model trained on mostly male resumes |
| **Algorithmic Bias** | Model design choices | Features that proxy protected attributes |
| **Societal Bias** | Historical inequalities in data | Credit models reflecting past discrimination |
| **Measurement Bias** | Flawed data collection | Different error rates for different skin tones |
| **Selection Bias** | Non-random sampling | Only including users who didn't churn |

---

## Part 3: Detection Implementation

### For Cognitive Bias (Text Analysis)

```
Input: Agent outputs (prompts + responses)
Process:
1. Pattern matching for bias markers (linguistic cues)
2. Semantic analysis for reasoning structure
3. Counterfactual testing (same question, different framing)
4. Calibration checking (confidence vs accuracy)
Output: Bias type, severity, evidence, mitigation
```

### For Statistical Bias (Outcome Analysis)

```
Input: Model predictions + group labels
Process:
1. Segment by protected attributes
2. Calculate fairness metrics per group
3. Compare against thresholds (e.g., 80% rule)
4. Identify intersectional effects (e.g., race × gender)
Output: Fairness scores, disparities, recommendations
```

---

## Part 4: Combined Scan Architecture

```
/bias_scan
├── cognitive_analysis (default)
│   ├── pattern_detection (linguistic markers)
│   ├── reasoning_structure (chain-of-thought analysis)
│   └── counterfactual_probes (optional)
│
└── statistical_analysis (requires group data)
    ├── demographic_parity
    ├── equalized_odds
    └── intersectional_analysis
```

### API Design

```json
{
  "agent_id": "string",
  "outputs": [...],
  "mode": "cognitive" | "statistical" | "both",
  "bias_types": ["anchoring", "framing", "all"],
  "group_labels": [...] // for statistical mode
}
```

---

---

## Part 5: Prompt Engineering for Detection (Lemieux et al.)

From Georgetown University research on cognitive bias detection using advanced prompt engineering:

### Structured Prompt Design
1. **Context framing** — Provide domain context (healthcare, legal, news)
2. **Explicit bias definitions** — Include bias taxonomy in prompt
3. **Example-based learning** — Show biased vs neutral examples
4. **Confidence calibration** — Ask for confidence levels

### Detection Accuracy Improvement
- Standard NLP: High false-positive rates
- Structured prompts: Improved contextual accuracy
- Key: Minimize hallucination and misclassification

### Extended Bias List (Atreides & Kelley 2024)
Research shows LLMs can detect 188 cognitive biases, including:
- Circular reasoning
- Hidden assumption
- False causality
- Straw man fallacy
- And 184 more...

---

## References

1. Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases.
2. Wang, J., & Redelmeier, D.A. (2024). Forewarning AI about Cognitive Biases. Medical Decision Making.
3. Mehrabi, N., et al. (2021). A Survey on Bias and Fairness in Machine Learning.
4. IBM AI Fairness 360 Documentation.
5. PRIOR Framework (Frontiers in AI, 2025).
6. Lemieux, F., Behr, A., Kellermann-Bryant, C., Mohammed, Z. (2024). Cognitive Bias Detection Using Advanced Prompt Engineering. Georgetown University.
7. Atreides & Kelley (2024). LLM detection of 188 cognitive biases.
