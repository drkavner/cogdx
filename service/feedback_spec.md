# Feedback Endpoint Spec

## Purpose
Collect accuracy feedback on bias/calibration diagnoses to improve detection over time.

## Endpoint
POST /feedback

## Request Schema
```json
{
  "diagnosis_id": "string (optional - reference to prior call)",
  "endpoint": "/bias_scan | /calibration_audit | /reasoning_trace_analysis",
  "accurate": true | false,
  "severity_correct": true | false | null,
  "comments": "optional free text",
  "agent_id": "string"
}
```

## Response
```json
{
  "received": true,
  "feedback_id": "uuid",
  "message": "Thank you for the feedback. This helps improve detection accuracy."
}
```

## Storage
- Append to a local JSONL file: `feedback.jsonl`
- Include timestamp

## Pricing
- FREE (no x402 charge) - we want to encourage feedback

## Integration
- Add to handlers in index.ts
- Add to openapi.yaml
- Add to catalog
