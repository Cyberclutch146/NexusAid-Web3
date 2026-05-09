#!/usr/bin/env node
// scripts/dev-start.js
// Unified startup script for NexusAid local development.
// Handles: Node → Deploy → Sync Env → Reset DB → Backend + Frontend

const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');

const ROOT = path.join(__dirname, '..');

// ─── Helpers ─────────────────────────────────────────────────────
function log(tag, msg, color = '\x1b[36m') {
  console.log(`${color}[${tag}]\x1b[0m ${msg}`);
}

function waitForPort(port, host = '127.0.0.1', timeout = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => { sock.destroy(); retry(); });
      sock.once('timeout', () => { sock.destroy(); retry(); });
      sock.connect(port, host);
    };
    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for ${host}:${port}`));
      } else {
        setTimeout(tryConnect, 1500);
      }
    };
    tryConnect();
  });
}

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: opts.stdio || 'inherit',
      shell: true,
      env: { ...process.env, ...opts.env },
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

function spawnBg(tag, cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, ...opts.env },
  });
  const colorize = (line) => line.toString().split('\n').filter(Boolean).forEach(l => {
    log(tag, l, opts.color || '\x1b[37m');
  });
  child.stdout.on('data', colorize);
  child.stderr.on('data', colorize);
  child.on('error', (err) => log(tag, `Error: ${err.message}`, '\x1b[31m'));
  return child;
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('\n\x1b[1m\x1b[35m  ╔═══════════════════════════════════════╗');
  console.log('  ║     NexusAid Dev Environment Start     ║');
  console.log('  ╚═══════════════════════════════════════╝\x1b[0m\n');

  // Step 1: Start Hardhat Node
  log('1/5', '🔗 Starting Hardhat Node...', '\x1b[33m');
  const node = spawnBg('NODE', 'npm', ['run', 'node:contracts'], { color: '\x1b[33m' });

  // Step 2: Wait for node to be ready
  log('2/5', '⏳ Waiting for blockchain (port 8545)...', '\x1b[34m');
  await waitForPort(8545);
  log('2/5', '✅ Blockchain node is ready!', '\x1b[32m');

  // Step 3: Deploy contracts
  log('3/5', '📦 Deploying contracts...', '\x1b[34m');
  await runCommand('npm', ['run', 'deploy:local']);
  log('3/5', '✅ Contracts deployed!', '\x1b[32m');

  // Step 4: Sync environment files
  log('4/5', '🔄 Syncing environment files...', '\x1b[34m');
  await runCommand('node', ['scripts/sync-env.js']);
  log('4/5', '✅ Environment synced!', '\x1b[32m');

  // Step 5: Reset stale DB IDs
  log('5/5', '🗑️  Resetting stale blockchain IDs in Firestore...', '\x1b[34m');
  try {
    await runCommand('node', ['scripts/reset-web3-ids.js'], {
      env: { GOOGLE_APPLICATION_CREDENTIALS: path.join(ROOT, 'frontend', 'serviceAccountKey.json') },
    });
    log('5/5', '✅ Database reset complete!', '\x1b[32m');
  } catch {
    log('5/5', '⚠️  DB reset had an error (non-fatal, continuing...)', '\x1b[33m');
  }

  // Success banner
  console.log(`
\x1b[32m\x1b[1m
   ██████╗██╗   ██╗ ██████╗ ██████╗███████╗███████╗███████╗
  ██╔════╝██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝██╔════╝
  ╚█████╗ ██║   ██║██║     ██║     █████╗  ███████╗███████╗
   ╚═══██╗██║   ██║██║     ██║     ██╔══╝  ╚════██║╚════██║
  ██████╔╝╚██████╔╝╚██████╗╚██████╗███████╗███████║███████║
  ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝╚══════╝╚══════╝╚══════╝
\x1b[0m
\x1b[36m  ✨ Setup complete! Starting services...\x1b[0m
`);

  // Step 6: Start Backend + Frontend
  const credPath = path.join(ROOT, 'frontend', 'serviceAccountKey.json');
  const backend = spawnBg('BACK', 'npm', ['run', 'dev', '--workspace=backend'], {
    color: '\x1b[32m',
    env: { GOOGLE_APPLICATION_CREDENTIALS: credPath },
  });
  const frontend = spawnBg('FRONT', 'npm', ['run', 'dev', '--workspace=frontend'], {
    color: '\x1b[35m',
  });

  log('🚀', 'All services running! Press Ctrl+C to stop.', '\x1b[1m\x1b[36m');

  // Cleanup on exit
  const cleanup = () => {
    console.log('\n\x1b[33m🛑 Shutting down all services...\x1b[0m');
    [node, backend, frontend].forEach(p => {
      try { p.kill('SIGTERM'); } catch {}
    });
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('\x1b[31m❌ Startup failed:\x1b[0m', err.message);
  process.exit(1);
});
