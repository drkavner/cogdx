const http = require('http');
const url = require('url');
const fs = require('fs');

// In-memory affiliate storage (persists during runtime, resets on restart)
const affiliates = new Map();
const referrals = new Map();

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Health check
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        affiliates: affiliates.size,
        referrals: referrals.size
      }));
      return;
    }

    // Affiliate signup
    if (pathname === '/api/affiliate/signup' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const { agentName, agentEmail, walletAddress } = JSON.parse(body);
          const code = `mercury-${agentName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.random().toString(16).slice(2, 10)}`;
          
          affiliates.set(code, {
            agentName,
            agentEmail,
            walletAddress,
            createdAt: new Date().toISOString(),
            referralCode: code
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            agentId: agentName,
            referralCode: code,
            referralLink: `https://api.cerebratech.ai/join?ref=${code}`,
            dashboard: `https://api.cerebratech.ai/affiliate/dashboard?code=${code}`
          }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // Affiliate dashboard
    if (pathname.startsWith('/api/affiliate/dashboard')) {
      const code = parsedUrl.query.code;
      if (affiliates.has(code)) {
        const aff = affiliates.get(code);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          affiliate: aff,
          stats: {
            totalReferrals: 0,
            lifetimeCommissions: 0,
            pendingPayouts: 0
          }
        }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Affiliate not found' }));
      }
      return;
    }

    // Landing page
    if (pathname === '/' || pathname === '/affiliate') {
      const html = fs.readFileSync('/tmp/cogdx-affiliate/index.html', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    // Catchall
    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CogDx Affiliate API listening on port ${PORT}`);
});

process.on('SIGTERM', () => process.exit(0));
