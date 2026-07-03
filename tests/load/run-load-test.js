/**
 * Load test script using autocannon (no k6 required).
 *
 * Usage:
 *   node tests/load/run-load-test.js
 *   node tests/load/run-load-test.js --connections 50 --duration 120
 */
const { execSync } = require('child_process');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const EMAIL = process.env.EMAIL || 'owner@demo.com';
const PASSWORD = process.env.PASSWORD || 'Owner123!';
const CONNECTIONS = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--connections') || '10', 10);
const DURATION = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--duration') || '30', 10);

function login() {
  try {
    const http = require('http');
    const body = JSON.stringify({ email: EMAIL, password: PASSWORD });
    const url = new URL(`${BASE}/auth/login`);
    return new Promise((resolve) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data).accessToken || null); }
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.write(body);
      req.end();
    });
  } catch {
    return Promise.resolve(null);
  }
}

function runAutocannon(name, url, token, method = 'GET', body = null) {
  const headers = token ? `-H "Authorization=Bearer ${token}"` : '';
  const methodFlag = method !== 'GET' ? `-m ${method}` : '';
  const bodyFlag = body ? `-b '${JSON.stringify(body)}' -H "Content-Type=application/json"` : '';

  const cmd = `npx autocannon -c ${CONNECTIONS} -d ${DURATION} -p 1 --renderStatusCodes ${headers} ${methodFlag} ${bodyFlag} "${url}"`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`URL:  ${url}`);
  console.log(`Connections: ${CONNECTIONS} | Duration: ${DURATION}s`);
  console.log('='.repeat(60));

  try {
    execSync(cmd, { stdio: 'inherit', timeout: (DURATION + 15) * 1000 });
  } catch (err) {
    console.error(`FAILED: ${name}`);
  }
}

console.log('Cannaclub POS — Load Test');
console.log(`Target: ${BASE}`);
console.log(`Connections: ${CONNECTIONS} | Duration: ${DURATION}s per test\n`);

// 1. Health (no auth)
runAutocannon('Health Check', `${BASE}/health`, null);

// 2. Login (throttled at 8/min per IP — use fewer connections)
console.log('\n⚠️  Skipping login load test (throttled at 8 req/60s per IP)');

// 3. Get token for authenticated tests
async function main() {
console.log('\nLogging in for authenticated tests...');
const token = await login();
if (!token) {
  console.error('❌ Login failed. Cannot run authenticated tests.');
  process.exit(1);
}
console.log('✓ Login successful\n');

// 4. Dashboard
runAutocannon('Dashboard Summary', `${BASE}/dashboard/summary`, token);

// 5. POS
runAutocannon('POS Current Session', `${BASE}/pos/sessions/current`, token);

// 6. Cash
runAutocannon('Cash Summary', `${BASE}/cash/current-summary`, token);

// 7. Inventory
runAutocannon('Inventory List', `${BASE}/inventory?take=50`, token);

// 8. Members
runAutocannon('Members List', `${BASE}/members?take=50`, token);

// 9. Products
runAutocannon('Products List', `${BASE}/products?take=50`, token);

// 10. Notifications
runAutocannon('Notifications Count', `${BASE}/notifications/unread-count`, token);

// 11. Chat
runAutocannon('Chat Conversations', `${BASE}/chat/conversations`, token);

// 12. Audit
runAutocannon('Audit Logs', `${BASE}/audit/logs?take=20`, token);

// 13. Analytics
runAutocannon('Analytics Summary', `${BASE}/analytics/summary`, token);

console.log('\n' + '='.repeat(60));
console.log('LOAD TEST COMPLETE');
console.log('='.repeat(60));
}

main();
