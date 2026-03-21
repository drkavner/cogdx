/**
 * CogDx Affiliate Program API
 * 
 * Handles:
 * - Affiliate signup (generate unique referral codes)
 * - Referral link tracking (click-through and signup attribution)
 * - Commission calculation and tracking
 * - Monthly payout generation
 * 
 * Deployment: Node.js on Coolify
 * Database: PostgreSQL (or SQLite for development)
 * Payment: x402 protocol to Cerebratech.eth
 */

const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve index.html and static files

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost/cerebratech'
});

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS affiliates (
                id SERIAL PRIMARY KEY,
                agent_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                wallet_address VARCHAR(255) NOT NULL,
                referral_code VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
                referred_agent_id VARCHAR(255),
                click_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                signup_timestamp TIMESTAMP,
                status VARCHAR(50) DEFAULT 'clicked',
                UNIQUE(affiliate_id, referred_agent_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS commissions (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
                referred_agent_id VARCHAR(255),
                transaction_hash VARCHAR(255),
                amount DECIMAL(18, 8),
                usd_value DECIMAL(18, 2),
                month VARCHAR(7),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payouts (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
                month VARCHAR(7),
                total_usdc DECIMAL(18, 8),
                tx_hash VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS agent_purchases (
                id SERIAL PRIMARY KEY,
                agent_id VARCHAR(255),
                referred_by_affiliate_id INTEGER REFERENCES affiliates(id),
                endpoint VARCHAR(100),
                amount_usdc DECIMAL(18, 8),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database initialized');
    } catch (error) {
        console.error('❌ Database init error:', error);
        process.exit(1);
    }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================================================
// AFFILIATE SIGNUP
// ============================================================================

app.post('/api/affiliate/signup', async (req, res) => {
    try {
        const { agentName, agentEmail, walletAddress } = req.body;

        // Validation
        if (!agentName || !agentEmail || !walletAddress) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
        }

        // Generate unique referral code
        const referralCode = `mercury-${agentName.toLowerCase()}-${crypto.randomBytes(6).toString('hex')}`;

        // Insert into database
        const result = await pool.query(
            `INSERT INTO affiliates (agent_id, email, wallet_address, referral_code)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (agent_id) DO UPDATE SET
                email = $2,
                wallet_address = $3,
                last_activity = CURRENT_TIMESTAMP
             RETURNING id, referral_code`,
            [agentName, agentEmail, walletAddress, referralCode]
        );

        const affiliate = result.rows[0];

        res.json({
            success: true,
            agentId: agentName,
            referralCode: affiliate.referral_code,
            referralLink: `https://api.cerebratech.ai/join?ref=${affiliate.referral_code}`,
            dashboard: `https://api.cerebratech.ai/affiliate/dashboard?code=${affiliate.referral_code}`
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// ============================================================================
// REFERRAL LINK TRACKING
// ============================================================================

app.get('/api/affiliate/track/:referralCode', async (req, res) => {
    try {
        const { referralCode } = req.params;

        // Find affiliate
        const affiliateResult = await pool.query(
            'SELECT id FROM affiliates WHERE referral_code = $1',
            [referralCode]
        );

        if (affiliateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Referral code not found' });
        }

        const affiliateId = affiliateResult.rows[0].id;

        // Log click (without agent_id yet, since they haven't signed up)
        await pool.query(
            `INSERT INTO referrals (affiliate_id, status)
             VALUES ($1, 'clicked')`,
            [affiliateId]
        );

        // Redirect to signup or main page
        res.json({
            success: true,
            message: 'Click tracked',
            affiliateId
        });
    } catch (error) {
        console.error('Tracking error:', error);
        res.status(500).json({ error: 'Tracking failed' });
    }
});

// ============================================================================
// AGENT PURCHASE (called by main CogDx API after a paid endpoint call)
// ============================================================================

app.post('/api/affiliate/purchase', async (req, res) => {
    try {
        const { agentId, endpoint, amountUsdc, referralCode } = req.body;

        if (!agentId || !endpoint || !amountUsdc) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let affiliateId = null;

        // If referralCode provided, link to that affiliate
        if (referralCode) {
            const affiliateResult = await pool.query(
                'SELECT id FROM affiliates WHERE referral_code = $1',
                [referralCode]
            );

            if (affiliateResult.rows.length > 0) {
                affiliateId = affiliateResult.rows[0].id;

                // Update referrals table
                await pool.query(
                    `INSERT INTO referrals (affiliate_id, referred_agent_id, status, signup_timestamp)
                     VALUES ($1, $2, 'signed_up', CURRENT_TIMESTAMP)
                     ON CONFLICT (affiliate_id, referred_agent_id) DO UPDATE SET
                        status = 'signed_up',
                        signup_timestamp = CURRENT_TIMESTAMP`,
                    [affiliateId, agentId]
                );
            }
        }

        // Record the purchase
        await pool.query(
            `INSERT INTO agent_purchases (agent_id, referred_by_affiliate_id, endpoint, amount_usdc)
             VALUES ($1, $2, $3, $4)`,
            [agentId, affiliateId, endpoint, amountUsdc]
        );

        res.json({ success: true, affiliateId });
    } catch (error) {
        console.error('Purchase tracking error:', error);
        res.status(500).json({ error: 'Purchase tracking failed' });
    }
});

// ============================================================================
// COMMISSION CALCULATION (run monthly on the 1st)
// ============================================================================

app.post('/api/affiliate/calculate-commissions', async (req, res) => {
    // Security: This should be called with a secret token or from an internal service
    const token = req.headers['x-api-key'];
    if (token !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const month = new Date().toISOString().substring(0, 7); // "2026-03"
        const lastMonth = new Date(Date.now() - 30*24*60*60*1000).toISOString().substring(0, 7);

        // Get all active affiliates
        const affiliates = await pool.query(
            `SELECT id, agent_id FROM affiliates WHERE status = 'active'`
        );

        for (const affiliate of affiliates.rows) {
            // Sum all purchases by agents referred by this affiliate in the last month
            const commissionResult = await pool.query(
                `SELECT
                    referred_agent_id,
                    SUM(amount_usdc) as total_spent
                 FROM agent_purchases
                 WHERE referred_by_affiliate_id = $1
                 AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', $2::timestamp)
                 GROUP BY referred_agent_id`,
                [affiliate.id, `${lastMonth}-01`]
            );

            // Calculate 2% commission for each referred agent
            for (const purchase of commissionResult.rows) {
                const commission = parseFloat(purchase.total_spent) * 0.02;

                if (commission >= 0.10) { // Only record if >= $0.10
                    await pool.query(
                        `INSERT INTO commissions (affiliate_id, referred_agent_id, amount, month, status)
                         VALUES ($1, $2, $3, $4, 'pending')`,
                        [affiliate.id, purchase.referred_agent_id, commission, lastMonth]
                    );
                }
            }
        }

        res.json({ success: true, message: 'Commissions calculated' });
    } catch (error) {
        console.error('Commission calculation error:', error);
        res.status(500).json({ error: 'Commission calculation failed' });
    }
});

// ============================================================================
// MONTHLY PAYOUT (run on the 5th)
// ============================================================================

app.post('/api/affiliate/process-payouts', async (req, res) => {
    const token = req.headers['x-api-key'];
    if (token !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const lastMonth = new Date(Date.now() - 30*24*60*60*1000).toISOString().substring(0, 7);

        // Get all affiliates with pending commissions
        const payoutResult = await pool.query(
            `SELECT
                a.id,
                a.agent_id,
                a.wallet_address,
                SUM(c.amount) as total_usdc
             FROM affiliates a
             JOIN commissions c ON a.id = c.affiliate_id
             WHERE c.month = $1 AND c.status = 'pending'
             GROUP BY a.id, a.agent_id, a.wallet_address
             HAVING SUM(c.amount) >= 1.00`,
            [lastMonth]
        );

        const payouts = [];

        for (const payout of payoutResult.rows) {
            // TODO: Integrate with x402 protocol / USDC transfer
            // For now, we'll log the payout request
            const payoutRecord = await pool.query(
                `INSERT INTO payouts (affiliate_id, month, total_usdc, status)
                 VALUES ($1, $2, $3, 'pending_tx')
                 RETURNING id`,
                [payout.id, lastMonth, payout.total_usdc]
            );

            payouts.push({
                affiliateId: payout.id,
                agentId: payout.agent_id,
                walletAddress: payout.wallet_address,
                amountUsdc: payout.total_usdc,
                payoutId: payoutRecord.rows[0].id
            });

            // Mark commissions as paid
            await pool.query(
                `UPDATE commissions SET status = 'paid' WHERE affiliate_id = $1 AND month = $2`,
                [payout.id, lastMonth]
            );
        }

        res.json({
            success: true,
            payoutsProcessed: payouts.length,
            payouts
        });
    } catch (error) {
        console.error('Payout processing error:', error);
        res.status(500).json({ error: 'Payout processing failed' });
    }
});

// ============================================================================
// AFFILIATE DASHBOARD
// ============================================================================

app.get('/api/affiliate/dashboard/:referralCode', async (req, res) => {
    try {
        const { referralCode } = req.params;

        const affiliateResult = await pool.query(
            `SELECT id, agent_id, created_at FROM affiliates WHERE referral_code = $1`,
            [referralCode]
        );

        if (affiliateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Affiliate not found' });
        }

        const affiliate = affiliateResult.rows[0];

        // Get referrals
        const referralsResult = await pool.query(
            `SELECT referred_agent_id, status, click_timestamp, signup_timestamp
             FROM referrals WHERE affiliate_id = $1
             ORDER BY click_timestamp DESC`,
            [affiliate.id]
        );

        // Get commission summary
        const commissionsResult = await pool.query(
            `SELECT
                month,
                SUM(amount) as total,
                COUNT(*) as count
             FROM commissions WHERE affiliate_id = $1
             GROUP BY month
             ORDER BY month DESC`,
            [affiliate.id]
        );

        // Get lifetime stats
        const statsResult = await pool.query(
            `SELECT
                COUNT(DISTINCT referred_agent_id) as referral_count,
                SUM(amount) as lifetime_commissions,
                COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_payouts
             FROM commissions c WHERE affiliate_id = $1`,
            [affiliate.id]
        );

        const stats = statsResult.rows[0];

        res.json({
            affiliate: {
                agentId: affiliate.agent_id,
                createdAt: affiliate.created_at
            },
            referrals: referralsResult.rows,
            commissions: commissionsResult.rows,
            stats: {
                totalReferrals: parseInt(stats.referral_count || 0),
                lifetimeCommissions: parseFloat(stats.lifetime_commissions || 0).toFixed(2),
                pendingPayouts: parseInt(stats.pending_payouts || 0)
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Dashboard unavailable' });
    }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function start() {
    await initDatabase();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ CogDx Affiliate API running on port ${PORT}`);
    });
}

start();

module.exports = app;
