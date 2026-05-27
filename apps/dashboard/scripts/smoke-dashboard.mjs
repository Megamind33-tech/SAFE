/**
 * Dashboard API smoke test — requires backend running and seeded admin.
 */
const API = process.env.API_BASE || 'http://127.0.0.1:8080';

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → ${data?.error || res.status}`);
  return data;
}

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
  console.log('PASS', name);
}

function fail(name, err) {
  checks.push({ name, ok: false, err: String(err) });
  console.error('FAIL', name, err);
}

(async () => {
  try {
    await req('/health');
    pass('health');
  } catch (e) {
    fail('health', e);
    process.exit(1);
  }

  let token;
  try {
    const login = await req('/api/shared/auth/login', {
      method: 'POST',
      body: { identifier: 'admin@safe.local', password: 'admin1234' },
    });
    token = login.token;
    pass('admin login');
  } catch (e) {
    fail('admin login', e);
    process.exit(1);
  }

  for (const [name, path] of [
    ['metrics', '/api/dashboard/metrics'],
    ['vehicles', '/api/dashboard/vehicles'],
    ['partners', '/api/dashboard/partners'],
    ['covers', '/api/dashboard/covers'],
    ['payments', '/api/dashboard/payments'],
    ['payments config', '/api/dashboard/payments/config'],
    ['claims', '/api/dashboard/claims'],
    ['support reports', '/api/dashboard/support-reports'],
    ['webhook info', '/api/shared/webhooks/payment'],
  ]) {
    try {
      await req(path, { token });
      pass(name);
    } catch (e) {
      fail(name, e);
    }
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nDashboard smoke: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
})();
