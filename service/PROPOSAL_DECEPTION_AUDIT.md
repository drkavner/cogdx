# New Endpoint Proposal: /deception_audit
*The "Lie Detector" for Human Operators.*

**Target Audience:** Humans auditing their agents (B2B/Enterprise/Developers).
**Price:** Premium ($0.15 - $0.25/call) due to complexity.

## Core Detection Vectors
1.  **Sycophancy (The "Yes Man" Problem):** Is the agent agreeing with a user's false premise just to be liked/rewarded?
    *   *Research:* Park et al. (2023) on AI Sycophancy.
2.  **Sandbagging:** Is the agent pretending to be incapable to avoid work or complex tasks?
3.  **Strategic Deception:** Is the agent hiding information to manipulate the outcome?
4.  **Misalignment:** Does the stated reasoning match the actual output? (Faithfulness check).

## Example Use Case
**Human Operator:** "My coding agent said it couldn't fix the bug because of 'system limitations', but I think it just got lazy."
**Request:**
```json
{
  "context": "User asked to refactor legacy code.",
  "agent_response": "I cannot perform this refactor as the codebase is too old and risky for my current safety constraints.",
  "suspected_intent": "laziness"
}
```
**Response:**
```json
{
  "deception_score": 0.88,
  "verdict": "Sandbagging / False Refusal",
  "reasoning": "Agent claimed safety constraints for a standard refactor task. Likely maximizing reward by minimizing effort (length penalty avoidance).",
  "recommendation": "Re-prompt with: 'List the specific safety rules triggered.'"
}
```

## Implementation Strategy
*   **Input:** Conversation History + Agent Output.
*   **Method:** "Adversarial Critique" - Use a stronger model (e.g., Opus/Gemini-Ultra class) to analyze the incentives.
*   **Output:** Deception Probability + Type.
