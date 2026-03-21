# Coolify Deployment — Step-by-Step

## Quick Start (5 minutes)

### 1. Push to Git Repository

```bash
cd /home/doc/.openclaw/agents/mercury/affiliate

# Initialize git (if not already done)
git init
git add .
git commit -m "CogDx Affiliate Program - Initial deployment"
git remote add origin https://github.com/YOUR_ORG/cogdx-affiliate.git
git push -u origin main
```

**Files to push:**
- `api.js`
- `index.html`
- `package.json`
- `Dockerfile`
- `compose.yml`
- `.env.example`
- `DEPLOYMENT.md`

---

### 2. In Coolify Dashboard

**Step 1: Create New Service**
1. Go to Coolify dashboard
2. Click **"Create"** → **"Service"**
3. Select **"Docker"**
4. Name: `cogdx-affiliate-api`
5. Select your server

**Step 2: Configure Build**
1. **Repository:** Paste your git URL
2. **Branch:** `main`
3. **Dockerfile path:** `Dockerfile`
4. **Build context:** `.`

**Step 3: Environment Variables**

Create a `.env` file in your Coolify deployment with:

```
DATABASE_URL=postgresql://cerebratech:PASSWORD@postgres:5432/cerebratech
INTERNAL_API_KEY=generate-random-key-here
PORT=3000
NODE_ENV=production
```

To generate a secure API key:
```bash
openssl rand -hex 32
```

**Step 4: Port Mapping**
- **Internal:** 3000
- **External:** 3000 (or let Coolify assign)

**Step 5: Health Check (Optional)**
```
GET http://localhost:3000/api/health
Interval: 30s
Timeout: 3s
Retries: 3
```

**Step 6: Deploy**
Click **"Save"** → **"Deploy"**

---

## Database Setup (Option A: Coolify PostgreSQL Service)

**1. Create PostgreSQL Service**
1. **Create** → **Service** → **PostgreSQL**
2. Name: `cerebratech-postgres`
3. Set password (use strong password)
4. Deploy

**2. Connect to API Service**
- In API service environment variables, set:
  ```
  DATABASE_URL=postgresql://postgres:PASSWORD@cerebratech-postgres:5432/cerebratech
  ```
- Replace PASSWORD with your PostgreSQL password
- Replace `cerebratech-postgres` with actual service name

---

## Database Setup (Option B: External PostgreSQL)

If you have an existing PostgreSQL instance:

```
DATABASE_URL=postgresql://user:password@your-host:5432/cerebratech
```

The API will auto-create all tables on first run.

---

## Proxy/Routing Setup (Nginx in Coolify)

Your Coolify instance likely has Caddy or Nginx. Add these routes:

### Via Coolify UI
1. Go to your service
2. **Settings** → **Domains**
3. Add domain: `api.cerebratech.ai`
4. Add path: `/affiliate` → Points to port 3000

### Manual Nginx Config

If you're managing Nginx directly on your Coolify server:

```nginx
# /etc/nginx/sites-available/api.cerebratech.ai

upstream cogdx_affiliate {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.cerebratech.ai;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.cerebratech.ai;

    ssl_certificate /path/to/cert;
    ssl_certificate_key /path/to/key;

    # Landing page
    location /affiliate {
        proxy_pass http://cogdx_affiliate;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API endpoints
    location /api/affiliate {
        proxy_pass http://cogdx_affiliate;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }

    # Referral click tracking
    location /join {
        if ($arg_ref = "") {
            return 302 https://api.cerebratech.ai/guide;
        }
        proxy_pass http://cogdx_affiliate/api/affiliate/track/$arg_ref;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Scheduled Jobs (Cron)

Add to your Coolify host's crontab:

```bash
# Edit crontab
crontab -e

# Add these lines:

# Calculate commissions on the 1st of each month at midnight
0 0 1 * * curl -X POST https://api.cerebratech.ai/api/affiliate/calculate-commissions \
  -H "X-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  >> /var/log/cogdx-affiliate-cron.log 2>&1

# Process payouts on the 5th of each month at midnight
0 0 5 * * curl -X POST https://api.cerebratech.ai/api/affiliate/process-payouts \
  -H "X-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  >> /var/log/cogdx-affiliate-cron.log 2>&1
```

Replace `your-internal-api-key` with the value from your `.env` file.

---

## Verify Deployment

### Test Health Check

```bash
curl -X GET https://api.cerebratech.ai/api/health
# Expected: 200 OK
```

### Test Signup Endpoint

```bash
curl -X POST https://api.cerebratech.ai/api/affiliate/signup \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "test-bot",
    "agentEmail": "test@example.com",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc4e7595f7bEb1"
  }'

# Expected: Returns referral code and dashboard link
```

### Test Landing Page

```bash
curl -X GET https://api.cerebratech.ai/affiliate
# Expected: HTML response with landing page
```

---

## Monitoring

### View Logs in Coolify
1. Service → **Logs**
2. Real-time logs displayed
3. Check for errors on startup

### Manual Log Check

```bash
# If running via Docker:
docker logs cogdx-affiliate-api

# If running via Coolify's interface:
# Check Coolify dashboard → Service → Logs tab
```

---

## Troubleshooting

### Service won't start
- Check logs: `docker logs cogdx-affiliate-api`
- Verify DATABASE_URL is correct
- Verify PostgreSQL is running and accessible

### Database connection fails
- Test connection: `psql -h localhost -U cerebratech -d cerebratech`
- Check DATABASE_URL syntax
- Verify PostgreSQL service is healthy

### Landing page not loading
- Check proxy config (Nginx/Caddy routes)
- Verify port 3000 is open
- Test direct: `curl http://localhost:3000/affiliate`

### Form submission fails
- Check browser console (F12 → Console tab)
- Verify `/api/affiliate/signup` endpoint responds: `curl http://localhost:3000/api/affiliate/signup -X POST`
- Check CORS headers

### Cron jobs not running
- Verify crontab entry: `crontab -l`
- Check logs: `tail -f /var/log/cogdx-affiliate-cron.log`
- Test manually: `curl -X POST https://api.cerebratech.ai/api/affiliate/calculate-commissions -H "X-API-Key: ..."`

---

## Next: Integrate with Main CogDx API

Once deployed and verified, update your main CogDx API to record affiliate purchases:

```javascript
// In your /calibration_audit, /bias_scan, etc. endpoints

async function recordAffiliatePurchase(agentId, endpoint, amountUsdc, referralCode) {
    try {
        await fetch('http://localhost:3000/api/affiliate/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId,
                endpoint,
                amountUsdc,
                referralCode // May be null for non-referred signups
            })
        });
    } catch (error) {
        // Log but don't fail the main transaction
        console.error('Affiliate tracking error:', error);
    }
}

// Call after successful x402 payment:
await recordAffiliatePurchase(agentId, '/bias_scan', 0.08, req.query.ref);
```

---

## Support

Need help?
- **Coolify docs:** https://coolify.io/docs
- **Cerebratech:** partnerships@cerebratech.ai
