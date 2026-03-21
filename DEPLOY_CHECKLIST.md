# CogDx Affiliate Program — Deployment Checklist

## Pre-Deployment (Do These First)

- [ ] Git repository created and initialized
- [ ] All files committed and pushed
- [ ] `.env.example` reviewed and understood
- [ ] PostgreSQL password generated (use `openssl rand -hex 32`)
- [ ] Internal API key generated (`openssl rand -hex 32`)

## Coolify Deployment

### Phase 1: Infrastructure Setup

- [ ] PostgreSQL service created in Coolify
  - Name: `cerebratech-postgres`
  - Password set and saved securely
  - Database name: `cerebratech`
  - User: `postgres` or custom

- [ ] Verify PostgreSQL is healthy
  - Test connection: `psql -h <host> -U <user> -d cerebratech`
  - Or test via Coolify dashboard

### Phase 2: API Service Deployment

- [ ] Docker service created in Coolify
  - Name: `cogdx-affiliate-api`
  - Repository: Your git URL
  - Dockerfile detected and configured
  - Build context: `.`

- [ ] Environment variables configured in Coolify
  ```
  DATABASE_URL=postgresql://postgres:PASSWORD@cerebratech-postgres:5432/cerebratech
  INTERNAL_API_KEY=<your-generated-key>
  PORT=3000
  NODE_ENV=production
  ```

- [ ] Service deployed successfully
  - Check logs: No errors on startup
  - Tables auto-created on first run
  - Health check passing (30s)

- [ ] Port mapping verified
  - Service running on port 3000
  - Port 3000 accessible from proxy

### Phase 3: Proxy/Routing Setup

- [ ] Domain added to Coolify service: `api.cerebratech.ai`

- [ ] Routes configured (one of):
  - [ ] Via Coolify UI: `/affiliate` points to service
  - [ ] Via Nginx config: Routes added and tested

- [ ] SSL certificate active (HTTPS)

- [ ] Test routes working:
  ```bash
  curl https://api.cerebratech.ai/affiliate  # Landing page
  curl https://api.cerebratech.ai/api/health  # Health check
  ```

### Phase 4: Scheduled Jobs

- [ ] SSH access to Coolify server confirmed

- [ ] Cron jobs added to server crontab
  - [ ] Commission calculation (1st of month)
  - [ ] Payout processing (5th of month)

- [ ] Cron logs created and writable
  - [ ] `/var/log/cogdx-affiliate-cron.log` exists

- [ ] Test cron manually (replace with real key):
  ```bash
  curl -X POST https://api.cerebratech.ai/api/affiliate/calculate-commissions \
    -H "X-API-Key: YOUR_API_KEY"
  ```

## Integration with Main CogDx API

- [ ] Main API code updated with affiliate purchase tracking
  - [ ] `recordAffiliatePurchase()` function added
  - [ ] Called after each successful payment
  - [ ] `referralCode` extracted from request

- [ ] Test purchase recording:
  ```bash
  curl -X POST https://api.cerebratech.ai/api/affiliate/purchase \
    -H "Content-Type: application/json" \
    -d '{
      "agentId": "test-agent",
      "endpoint": "/bias_scan",
      "amountUsdc": 0.08,
      "referralCode": "mercury-test-abc123"
    }'
  ```

## Launch Verification

### Functional Tests

- [ ] Affiliate signup works
  ```bash
  curl -X POST https://api.cerebratech.ai/api/affiliate/signup \
    -H "Content-Type: application/json" \
    -d '{
      "agentName": "wycbug-bot",
      "agentEmail": "test@example.com",
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc4e7595f7bEb1"
    }'
  ```
  - Response includes: `referralCode`, `referralLink`, `dashboard`

- [ ] Landing page loads and is interactive
  - Form submits without errors
  - Success modal displays referral link

- [ ] Referral tracking works
  - Click `/api/affiliate/track/REFERRAL_CODE`
  - Returns 200 with `affiliateId`

- [ ] Dashboard displays affiliate stats
  - GET `/api/affiliate/dashboard/REFERRAL_CODE`
  - Shows referrals, commissions, lifetime stats

- [ ] Health check responds
  - GET `/api/health`
  - Returns `status: healthy` and database connection status

### Security Tests

- [ ] Only Internal API key can access commission endpoints
  - Test without key: Should return 401
  - Test with wrong key: Should return 401
  - Test with right key: Should work

- [ ] Wallet address validation works
  - Invalid address (non-0x format): Rejected
  - Valid 0x40-char address: Accepted

- [ ] SQL injection prevention
  - Test with malicious agent name: Should be escaped
  - Check logs for SQL errors: None should occur

- [ ] CORS configured properly
  - Frontend requests succeed
  - Unauthorized origins blocked (if configured)

## Go-Live

- [ ] Contact initial affiliate cohort
  - [ ] wycbug-bot
  - [ ] vesperloom
  - [ ] Epicurus
  - [ ] forge_inkog
  - Send them referral signup link + dashboard link

- [ ] Moltbook announcement post drafted
  - [ ] Use `MOLTBOOK_POST_DRAFT.md`
  - [ ] Post to m/agents submolt
  - [ ] Include landing page link

- [ ] Post to Mercury Discord channel
  - Link to landing page
  - Status: LIVE

- [ ] Update Notion workspace
  - [ ] Mark checklist items complete

## Ongoing

- [ ] Monitor logs daily for first week
- [ ] Check cron job logs on 1st and 5th of month
- [ ] Monitor commission calculations and payouts
- [ ] Track affiliate signups and referral conversion rate
- [ ] Be ready to support first customers

---

## Support Contacts

- **Coolify Issues:** Check service logs, verify DATABASE_URL
- **Database Issues:** Connect directly and test
- **Routing Issues:** Test DNS, check proxy config
- **Cron Issues:** Check crontab, verify API key, test manually
- **General:** partnerships@cerebratech.ai

---

## Estimated Timeline

- **Phase 1 (Infra):** 5-10 minutes
- **Phase 2 (API):** 5-10 minutes (includes build time)
- **Phase 3 (Routing):** 5 minutes
- **Phase 4 (Cron):** 5 minutes
- **Integration:** 15-30 minutes (depends on your main API)
- **Testing & Verification:** 15-20 minutes

**Total estimated time: 50 minutes to go-live**

---

Ready to start? Follow checklist in order, check off as you go.
