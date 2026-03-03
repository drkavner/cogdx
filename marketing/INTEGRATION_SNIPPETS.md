# Mercury Integration Snippets

## Quick Start

### Check Service Health (No Payment)
```bash
curl https://api.cerebratech.ai/health
```

### Get Service Catalog (No Payment)
```bash
curl https://api.cerebratech.ai/catalog
```

---

## Paid Endpoints

### 1. Calibration Audit (curl)
```bash
# First call without payment → returns 402 with payment instructions
curl -X POST https://api.cerebratech.ai/calibration_audit \
  -H "Content-Type: application/json" \
  -d '{
    "outputs": [
      {"statement": "The answer is 42", "confidence": 0.95},
      {"statement": "Water boils at 100C at sea level", "confidence": 0.99}
    ]
  }'

# Response: 402 Payment Required
# Header: X-PAYMENT-REQUIRED: <base64 payment instructions>

# After constructing x402 payment signature:
curl -X POST https://api.cerebratech.ai/calibration_audit \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <your-x402-signature>" \
  -d '{
    "outputs": [
      {"statement": "The answer is 42", "confidence": 0.95},
      {"statement": "Water boils at 100C at sea level", "confidence": 0.99}
    ]
  }'
```

### 2. Bias Scan (curl)
```bash
curl -X POST https://api.cerebratech.ai/bias_scan \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <your-x402-signature>" \
  -d '{
    "text": "Based on my first impression, this candidate is clearly the best choice for the role.",
    "context": "hiring_decision"
  }'
```

---

## JavaScript/TypeScript Integration

### Using fetch with x402
```typescript
import { createPayment } from '@x402/client'; // hypothetical x402 client

const MERCURY_BASE = 'https://api.cerebratech.ai';

async function calibrationAudit(outputs: Array<{statement: string, confidence: number}>) {
  // First, get payment requirements
  const initialResponse = await fetch(`${MERCURY_BASE}/calibration_audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outputs })
  });

  if (initialResponse.status === 402) {
    const paymentRequired = initialResponse.headers.get('X-PAYMENT-REQUIRED');
    const paymentSignature = await createPayment(paymentRequired, {
      wallet: process.env.AGENT_WALLET,
      network: 'base'
    });

    // Retry with payment
    const paidResponse = await fetch(`${MERCURY_BASE}/calibration_audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': paymentSignature
      },
      body: JSON.stringify({ outputs })
    });

    return paidResponse.json();
  }

  return initialResponse.json();
}

// Usage
const result = await calibrationAudit([
  { statement: "Paris is the capital of France", confidence: 0.99 },
  { statement: "The moon landing was in 1969", confidence: 0.95 }
]);

console.log(result);
// {
//   overall_calibration: 0.92,
//   items: [...],
//   recommendations: [...]
// }
```

### Bias Scan Example
```typescript
async function biasScan(text: string, context?: string) {
  const response = await fetch(`${MERCURY_BASE}/bias_scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': await getX402Signature('/bias_scan')
    },
    body: JSON.stringify({ text, context })
  });

  return response.json();
}

// Example: Check your own reasoning before output
const myDraft = "This is clearly the only correct interpretation...";
const biasCheck = await biasScan(myDraft, "analysis_output");

if (biasCheck.biases_detected.length > 0) {
  console.warn("Potential biases found:", biasCheck.biases_detected);
  // Revise output before delivery
}
```

---

## Agent Card Discovery
```bash
# Get machine-readable service description
curl https://api.cerebratech.ai/.well-known/agent.json
```

## OpenAPI Spec
```bash
# Get full API specification
curl https://api.cerebratech.ai/openapi.yaml
```
