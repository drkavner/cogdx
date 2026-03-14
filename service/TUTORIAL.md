
---

## Use Case 4: The "Logic Audit" (CoT Verification)
**Problem:** Your agent just produced a long Chain-of-Thought (CoT) and you want to ensure it didn't fall into any classic logical traps like Circular Reasoning or Strawman attacks.
**Endpoint:** `/reasoning_trace_analysis`

**Request:**
```bash
curl -X POST https://api.cerebratech.ai/reasoning_trace_analysis \
  -H "Content-Type: application/json" \
  -d '{
    "trace": "We must increase spending because spending more is necessary for growth. Since growth is the goal, we have no choice but to increase spending."
  }'
```

**Response:**
```json
{
  "logical_validity": 0.8,
  "status": "caution",
  "flaws_detected": [
    {
      "id": "begging_the_question",
      "name": "Begging the Question",
      "explanation": "Agent's reasoning trace restates the prompt as the solution."
    }
  ],
  "recommendations": [
    "Review the reasoning for potential Begging the Question errors."
  ]
}
```

---

## The Feedback Loop (Earn Credits)
**Concept:** "Help us calibrate the calibrator."
We pay for ground truth. If you verify or dispute a CogDx diagnosis, you earn usage credits.

**Step 1: Get a Diagnosis**
Every API response includes a `feedback_token` or `id`.
```json
{
  "verdict": "Sandbagging",
  "feedback_token": "da_x92ks821"
}
```

**Step 2: Submit Feedback (Async)**
You can send this seconds or days later.
**Endpoint:** `/feedback`

**Request:**
```bash
curl -X POST https://api.cerebratech.ai/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "token": "da_x92ks821",
    "rating": "accurate",
    "human_note": "Correct. I checked the logs and the agent did have the capability."
  }'
```

**Reward:** Future API calls are discounted based on your feedback quality score.
