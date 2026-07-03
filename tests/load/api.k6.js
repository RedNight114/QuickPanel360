/**
 * k6 load test for Cannaclub POS API.
 *
 * Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
 *
 * Usage:
 *   k6 run tests/load/api.k6.js
 *   k6 run tests/load/api.k6.js --env BASE_URL=https://api.staging.com
 *   k6 run tests/load/api.k6.js --env USERS=100 --env DURATION=5m
 *
 * Custom metrics reported:
 *   login_duration    — auth/login latency
 *   dashboard_duration — dashboard/summary latency
 *   pos_duration      — pos/sessions/current latency
 *   chat_duration     — chat/conversations latency
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.EMAIL || 'owner@cannaclub.local';
const PASSWORD = __ENV.PASSWORD || 'password123';
const USERS = parseInt(__ENV.USERS || '10', 10);
const DURATION = __ENV.DURATION || '2m';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const posDuration = new Trend('pos_duration', true);
const chatDuration = new Trend('chat_duration', true);
const dbErrors = new Counter('db_connection_errors');

export const options = {
  stages: [
    { duration: '30s', target: Math.ceil(USERS * 0.5) },
    { duration: '30s', target: USERS },
    { duration: DURATION, target: USERS },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
    errors: ['rate<0.05'],
    login_duration: ['p(95)<500'],
    dashboard_duration: ['p(95)<800'],
  },
};

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

function trackError(res, metricName) {
  const failed = res.status >= 400;
  errorRate.add(failed);
  if (res.status === 500 && res.body && res.body.includes('connection')) {
    dbErrors.add(1);
  }
  return !failed;
}

export default function () {
  let token;

  group('01_login', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
    );
    loginDuration.add(res.timings.duration);
    trackError(res, 'login');

    if (res.status === 200) {
      token = JSON.parse(res.body).accessToken;
    }
  });

  if (!token) {
    sleep(2);
    return;
  }

  const auth = authHeaders(token);

  group('02_dashboard', () => {
    const res = http.get(`${BASE_URL}/dashboard/summary`, { ...auth, tags: { name: 'dashboard_summary' } });
    dashboardDuration.add(res.timings.duration);
    trackError(res);

    http.get(`${BASE_URL}/dashboard/sales`, { ...auth, tags: { name: 'dashboard_sales' } });
    http.get(`${BASE_URL}/dashboard/inventory`, { ...auth, tags: { name: 'dashboard_inventory' } });
    http.get(`${BASE_URL}/dashboard/members`, { ...auth, tags: { name: 'dashboard_members' } });
  });

  sleep(0.3);

  group('03_pos', () => {
    const res = http.get(`${BASE_URL}/pos/sessions/current`, { ...auth, tags: { name: 'pos_session' } });
    posDuration.add(res.timings.duration);
    check(res, { 'pos 200/404': (r) => r.status === 200 || r.status === 404 });

    http.get(`${BASE_URL}/pos/sales?take=20`, { ...auth, tags: { name: 'pos_sales' } });
  });

  sleep(0.3);

  group('04_cash', () => {
    const res = http.get(`${BASE_URL}/cash/current-summary`, { ...auth, tags: { name: 'cash_summary' } });
    check(res, { 'cash 200/404': (r) => r.status === 200 || r.status === 404 });

    http.get(`${BASE_URL}/cash/movements?take=20`, { ...auth, tags: { name: 'cash_movements' } });
  });

  sleep(0.3);

  group('05_inventory', () => {
    http.get(`${BASE_URL}/inventory?take=50`, { ...auth, tags: { name: 'inventory' } });
    http.get(`${BASE_URL}/inventory/movements`, { ...auth, tags: { name: 'inventory_movements' } });
    http.get(`${BASE_URL}/products?take=50`, { ...auth, tags: { name: 'products' } });
  });

  sleep(0.3);

  group('06_members', () => {
    http.get(`${BASE_URL}/members?take=50`, { ...auth, tags: { name: 'members' } });
  });

  sleep(0.3);

  group('07_chat', () => {
    const res = http.get(`${BASE_URL}/chat/conversations`, { ...auth, tags: { name: 'chat_conversations' } });
    chatDuration.add(res.timings.duration);
    trackError(res);
  });

  sleep(0.3);

  group('08_notifications', () => {
    http.get(`${BASE_URL}/notifications/unread-count`, { ...auth, tags: { name: 'notif_count' } });
    http.get(`${BASE_URL}/notifications?take=10`, { ...auth, tags: { name: 'notif_list' } });
  });

  sleep(0.3);

  group('09_analytics', () => {
    http.get(`${BASE_URL}/analytics/summary`, { ...auth, tags: { name: 'analytics' } });
  });

  sleep(0.3);

  group('10_audit', () => {
    http.get(`${BASE_URL}/audit/logs?take=20`, { ...auth, tags: { name: 'audit' } });
  });

  sleep(0.5);
}
