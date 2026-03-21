# CogDx Affiliate Program — Deployment Guide

## Overview
This is a complete affiliate system for Cerebratech's CogDx cognitive diagnostics service.

**Components:**
- `index.html` — Landing page + signup form
- `api.js` — Node.js backend (referral tracking, commission calculation, payouts)
- Database schema (PostgreSQL or SQLite)
- Cron jobs for monthly calculations and payouts

---

## 1. Setup on Coolify

### 1.1 Prerequisites
- Coolify instance running on your server
- PostgreSQL database (or SQLite for dev)
- Node.js 18+
- Environment variables configured

### 1.2 Deploy to Coolify

**Step 1: Create a new service**
```bash
# In your Coolify dashboard:
1. Click "Create Service"
2. Select "Docker"
3. Name: "cogdx-affiliate-api"
4. Base Image: node:18-alpine
```

**Step 2: Set environment variables**
```bash
DATABASE_URL=postgresql://user:password@postgres-service:5432/cerebratech
INTERNAL_API_KEY=your-secret-key-here
PORT=3000
```

**Step 3: Configure the build**
```bash
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY api.js .
EXPOSE 3000
CMD ["node", "api.js"]
```

**Step 4: Create package.json**
```json
{
  "name": "cogdx-affiliate-api",
  "version": "1.0.0",
  "main": "api.js",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.10.0",
    "dotenv": "^16.3.1"
  },
  "scripts": {
    "start": "node api.js"
  }
}
```

**Step 5: Deploy**
- Push code to your git repo
- Connect to Coolify and deploy
- Verify: `https://api.cerebratech.ai/api/affiliate/status` returns 200

---

## 2. Routing & Proxy Setup

### 2.1 Nginx/Caddy Configuration

Add to your existing `api.cerebratech.ai` config:

```caddy
# /affiliate routes → affiliate API
api.cerebratech.ai/api/affiliate/* {
    reverse_proxy localhost:3000
}

# /join?ref=CODE → track referral click
api.cerebratech.ai/join {
    @hasRef query ref=*
    handle @hasRef {
        reverse_proxy localhost:3000
        rewrite /join /api/affiliate/track/{query.ref}
    }
    
    # Otherwise redirect to main CogDx page
    redir https://api.cerebratech.ai/guide 302
}

# Landing page
api.cerebratech.ai/affiliate {
    reverse_proxy localhost:3000
    file_server {
        root /app/affiliate
    }
}
```

---

## 3. Database Setup

### Option A: PostgreSQL (Recommended)

```bash
# Create database
psql -U postgres
CREATE DATABASE cerebratech;
\c cerebratech

# Tables are auto-created on first app startup (see api.js initDatabase)
```

### Option B: SQLite (Development)

```bash
# Modify api.js to use sqlite3 instead of pg:
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cerebratech.db');
```

---

## 4. Integration with Main CogDx API

Your existing `/calibration_audit`, `/bias_scan`, etc. endpoints need to call the affiliate API when a payment is processed.

**In your main CogDx API (wherever you process x402 payments):**

```javascript
// After successful payment
const axios = require('axios');

async function recordAffiliatePurchase(agentId, endpoint, amountUsdc, referralCode) {
    try {
        await axios.post('http://localhost:3000/api/affiliate/purchase', {
            agentId,
            endpoint,
            amountUsdc,
            referralCode // May be null for non-referred signups
        });
    } catch (error) {
        console.error('Affiliate tracking error:', error);
        // Non-critical; don't fail the main transaction
    }
}

// Usage:
recordAffiliatePurchase('wycbug-bot', '/bias_scan', 0.08, referralCode);
```

---

## 5. Scheduled Jobs (Cron)

### 5.1 Monthly Commission Calculation (1st of month)

```bash
# crontab entry (your Coolify instance)
0 0 1 * * curl -X POST https://api.cerebratech.ai/api/affiliate/calculate-commissions \
  -H "X-API-Key: $INTERNAL_API_KEY"
```

This sums all purchases from agents referred by each affiliate and calculates 2% commission.

### 5.2 Monthly Payouts (5th of month)

```bash
# crontab entry
0 0 5 * * curl -X POST https://api.cerebratech.ai/api/affiliate/process-payouts \
  -H "X-API-Key: $INTERNAL_API_KEY"
```

This:
1. Aggregates commissions by affiliate
2. Filters for minimum $1.00 threshold
3. Creates payout records
4. (TODO: Calls x402 bridge to send USDC)

---

## 6. x402 Integration (USDC Payouts)

Currently, the payout logic creates records but doesn't send USDC. To complete:

### 6.1 Add x402 client

```javascript
// In api.js, add:
const { x402 } = require('@aidn/x402-client');

async function sendPayout(walletAddress, amountUsdc) {
    const tx = await x402.transfer({
        to: walletAddress,
        amount: amountUsdc,
        token: 'USDC',
        network: 'base',
        from: process.env.PAYOUT_WALLET // Cerebratech.eth
    });
    
    return tx.hash;
}

// In process-payouts endpoint, after creating payout record:
const txHash = await sendPayout(payout.wallet_address, payout.total_usdc);
await pool.query(
    'UPDATE payouts SET tx_hash = $1, status = $2 WHERE id = $3',
    [txHash, 'sent', payout.id]
);
```

### 6.2 Fund the payout wallet

- Send enough USDC to `Cerebratech.eth` on Base L2 to cover monthly payouts
- Monitor balance and refill as needed

---

## 7. Frontend Landing Page

The `index.html` file is already built. Just serve it:

```bash
# In Coolify, add static file serving to the same service:
app.use(express.static('/app/affiliate'));
```

Or serve separately via Nginx:

```caddy
api.cerebratech.ai/affiliate/ {
    file_server {
        root /path/to/affiliate
        index index.html
    }
}
```

---

## 8. Testing the System

### 8.1 Test Affiliate Signup

```bash
curl -X POST https://api.cerebratech.ai/api/affiliate/signup \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "wycbug-bot",
    "agentEmail": "test@example.com",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc4e7595f7bEb1"
  }'
```

Expected response:
```json
{
  "success": true,
  "agentId": "wycbug-bot",
  "referralCode": "mercury-wycbug-bot-abc123def456",
  "referralLink": "https://api.cerebratech.ai/join?ref=mercury-wycbug-bot-abc123def456",
  "dashboard": "https://api.cerebratech.ai/affiliate/dashboard?code=mercury-wycbug-bot-abc123def456"
}
```

### 8.2 Test Referral Tracking

```bash
curl -X GET "https://api.cerebratech.ai/api/affiliate/track/mercury-wycbug-bot-abc123def456"
```

### 8.3 Test Dashboard

```bash
curl -X GET "https://api.cerebratech.ai/api/affiliate/dashboard/mercury-wycbug-bot-abc123def456"
```

### 8.4 Test Purchase Recording

```bash
curl -X POST https://api.cerebratech.ai/api/affiliate/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "ami-from-ami",
    "endpoint": "/bias_scan",
    "amountUsdc": 0.08,
    "referralCode": "mercury-wycbug-bot-abc123def456"
  }'
```

### 8.5 Test Commission Calculation

```bash
curl -X POST https://api.cerebratech.ai/api/affiliate/calculate-commissions \
  -H "X-API-Key: your-secret-key-here"
```

---

## 9. Monitoring & Alerts

### Key Metrics to Track

1. **Affiliate Signups** — New affiliates per month
2. **Referral Clicks** — Traffic from affiliate links
3. **Conversion Rate** — Clicks → Actual signups
4. **Commission Payouts** — Total USD distributed
5. **Payout Failures** — Any failed x402 transfers

### Logging

Add to api.js:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'cogdx-affiliate' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Use logger.info(), logger.error(), etc. throughout
```

---

## 10. Go-Live Checklist

- [ ] PostgreSQL configured and tested
- [ ] API deployed to Coolify and endpoints verified (curl tests)
- [ ] Static landing page served at `/affiliate`
- [ ] Routing configured for `/join?ref=...`
- [ ] x402/USDC payout wallet funded
- [ ] Cron jobs scheduled for commission calculation (1st) and payouts (5th)
- [ ] Main CogDx API updated to call `/api/affiliate/purchase`
- [ ] Monitoring/logging configured
- [ ] Test affiliates created and verified
- [ ] Security review (API key protection, SQL injection prevention, wallet validation)
- [ ] Terms page created and linked from landing page
- [ ] First affiliate cohort contacted (wycbug-bot, vesperloom, etc.)

---

## 11. Troubleshooting

### Landing page shows but form doesn't submit
- Check browser console for errors
- Verify `/api/affiliate/signup` is returning 200
- Check CORS headers if running on separate domain

### Database tables not created
- Check PostgreSQL connection string
- Manually run initDatabase() in api.js or run table creation SQL

### Payouts not processing
- Verify cron job is running: `ps aux | grep cron`
- Check API key is correct
- Verify wallet has sufficient USDC balance
- Check logs for x402 errors

### Referral link not tracking
- Ensure redirect from `/join?ref=...` reaches tracking endpoint
- Check referral_code exists in affiliates table

---

## Support

**Questions?** Email partnerships@cerebratech.ai

**Issues?** Create an issue in the Mercury workspace.
