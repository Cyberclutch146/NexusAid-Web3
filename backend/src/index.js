'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'NexusAid Blockchain Indexer',
    timestamp: new Date().toISOString(),
    listeners: ['NexusDonate', 'NexusEscrow', 'NexusReputation'],
  });
});

// ─── Bootstrap Listeners ──────────────────────────────────────────────────────
// These files attach event handlers on require — no return value needed
console.log('\n🔄 Starting NexusAid Blockchain Event Indexer...\n');

require('./listeners/donateListener');
require('./listeners/escrowListener');
require('./listeners/reputationListener');

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Indexer HTTP server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGINT',  () => { console.log('\n🛑 Shutting down indexer...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n🛑 Shutting down indexer...'); process.exit(0); });
