/**
 * ═══════════════════════════════════════════════════════════════════════════
 *   PODCAST PLATFORM — LAUNCH DASHBOARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   Shows which services are running, their URLs, and connection strings.
 *   Does NOT spawn processes (avoids duplicate conflicts).
 *
 *   Usage:  node start-all.js
 */

import net from 'net';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reset = '\x1b[0m';

const services = [
  { name: 'Admin API Server',       port: 3002, cmd: 'node index.js',         cwd: 'server',          color: '\x1b[36m', url: 'http://localhost:3002/api/health' },
  { name: 'Editor Server (MongoDB)', port: 3003, cmd: 'node editor/index.js',  cwd: 'server',          color: '\x1b[32m', url: 'http://localhost:3003' },
  { name: 'Frontend (React + Vite)', port: 5173, cmd: 'npm run dev',           cwd: 'D:\\PODCAST',     color: '\x1b[95m', url: 'http://localhost:5173' },
  { name: 'Prisma Studio',          port: 5555, cmd: 'npx prisma studio',     cwd: 'server',          color: '\x1b[33m', url: 'http://localhost:5555' },
];

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
    socket.connect(port, '127.0.0.1');
  });
}

function fetchJson(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function bold(text)  { return `\x1b[1m${text}${reset}`; }
function green(text) { return `\x1b[32m${text}${reset}`; }
function red(text)   { return `\x1b[31m${text}${reset}`; }
function dim(text)   { return `\x1b[2m${text}${reset}`; }
function cyan(text)  { return `\x1b[36m${text}${reset}`; }

console.log(bold('\n╔══════════════════════════════════════════════════════════╗'));
console.log(bold('║         PODCAST PLATFORM — LAUNCH DASHBOARD            ║'));
console.log(bold('╚══════════════════════════════════════════════════════════╝\n'));

const results = await Promise.all(services.map(async (s) => {
  const running = await checkPort(s.port);
  return { ...s, running };
}));

// Fetch MongoDB URI from editor server if running
let mongoUri = null;
const editor = results.find(s => s.name === 'Editor Server (MongoDB)');
if (editor?.running) {
  const health = await fetchJson('http://localhost:3003/api/editor/health');
  mongoUri = health?.mongoUri || null;
}

for (const s of results) {
  const status = s.running ? green('● RUNNING') : red('○ STOPPED');
  const cmd = s.running ? dim(s.cmd) : bold(s.cmd);
  console.log(`  ${s.color}${s.name.padEnd(28)}${reset} ${status}`);
  console.log(`  ${dim('→'.padEnd(28))} ${s.url}`);
  console.log(`  ${dim('  '.padEnd(28))} ${cmd}`);
  console.log('');
}

// Extra: MongoDB Compass connection
if (mongoUri) {
  console.log(`  ${cyan('MongoDB Compass')}${' '.repeat(15)} ${bold(mongoUri)}`);
  console.log(`  ${dim('→'.padEnd(28))} ${dim('Paste that URI into MongoDB Compass to browse the editor database')}`);
  console.log('');
} else if (editor?.running) {
  console.log(`  ${cyan('MongoDB Compass')}${' '.repeat(15)} ${bold('Restart editor server to see URI')}`);
  console.log('');
}

console.log(bold('  ─── QUICK START ───\n'));

const stopped = results.filter(s => !s.running);
if (stopped.length === 0) {
  console.log(green('  All services running! Open the links above.\n'));
} else {
  console.log('  Start in this order:\n');
  const order = ['Admin API Server', 'Editor Server (MongoDB)', 'Frontend (React + Vite)', 'Prisma Studio'];
  let step = 1;
  for (const name of order) {
    const s = stopped.find(sv => sv.name === name);
    if (s) {
      console.log(`  ${step}. cd ${s.cwd}`);
      console.log(`     ${s.cmd}`);
      step++;
    }
  }
  console.log('');
  console.log(dim('  Or start all at once in separate terminal windows.\n'));
}
