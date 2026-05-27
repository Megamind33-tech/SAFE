/**
 * Dashboard API smoke test — requires backend running and seeded admin/QA staff.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API_BASE || 'http://127.0.0.1:8080';
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend');

async function apiRequest(apiPath, { method = 'GET', token, body, expectStatus } = {}) {
  const res = await fetch(`${API}${apiPath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (expectStatus !== undefined) {
    if (res.status !== expectStatus) {
      throw new Error(`${apiPath} expected ${expectStatus} got ${res.status}: ${data?.error || res.status}`);
    }
    return data;
  }
  if (!res.ok) throw new Error(`${apiPath} → ${data?.error || res.status}`);
  return data;
}

async function staffLogin(identifier, password) {
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
  return { token: data.token, role: data.user?.role };
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
    execSync('npx tsx scripts/seedDashboardStaff.mjs', { cwd: backendRoot, stdio: 'pipe' });
  } catch (e) {
    console.warn('seedDashboardStaff:', e.message);
  }

  try {
    await apiRequest('/health');
    pass('health');
  } catch (e) {
    fail('health', e);
    process.exit(1);
  }

  let adminToken;
  try {
    const admin = await staffLogin('admin@safe.local', 'admin1234');
    adminToken = admin.token;
    pass('super_admin login');
    const session = await apiRequest('/api/dashboard/session', { token: adminToken });
    if (!session.permissions?.includes('staff.manage')) {
      throw new Error('super_admin missing staff.manage');
    }
    pass('session permissions for super_admin');
  } catch (e) {
    fail('super_admin login', e);
    process.exit(1);
  }

  for (const [name, route] of [
    ['metrics', '/api/dashboard/metrics'],
    ['overview', '/api/dashboard/overview'],
    ['readiness', '/api/dashboard/readiness'],
    ['vehicles', '/api/dashboard/vehicles'],
    ['partners', '/api/dashboard/partners'],
    ['covers', '/api/dashboard/covers'],
    ['payments', '/api/dashboard/payments'],
    ['payments config', '/api/dashboard/payments/config'],
    ['claims', '/api/dashboard/claims'],
    ['support reports', '/api/dashboard/support-reports'],
    ['trips', '/api/dashboard/trips'],
    ['qr scans', '/api/dashboard/qr/scans'],
    ['users', '/api/dashboard/users'],
    ['staff list', '/api/dashboard/staff'],
    ['webhook info', '/api/shared/webhooks/payment'],
  ]) {
    try {
      await apiRequest(route, { token: adminToken });
      pass(name);
    } catch (e) {
      fail(name, e);
    }
  }

  const QA_PASS = 'staffqa123';

  try {
    const support = await staffLogin('support@safe.local', QA_PASS);
    await apiRequest('/api/dashboard/payments', { token: support.token, expectStatus: 403 });
    pass('support_agent cannot access payments');
  } catch (e) {
    fail('support_agent cannot access payments', e);
  }

  try {
    const finance = await staffLogin('finance@safe.local', QA_PASS);
    const claims = await apiRequest('/api/dashboard/claims', { token: finance.token });
    const approved = (claims.claims || []).find((c) => c.status === 'approved');
    if (approved) {
      await apiRequest(`/api/dashboard/claims/${approved.id}`, {
        method: 'PATCH',
        token: finance.token,
        body: { status: 'rejected' },
        expectStatus: 403,
      });
      pass('finance_officer cannot reject claims');
    } else {
      await apiRequest('/api/dashboard/claims/fake-id', {
        method: 'PATCH',
        token: finance.token,
        body: { status: 'rejected' },
        expectStatus: 403,
      });
      pass('finance_officer cannot reject claims (no approved row)');
    }
  } catch (e) {
    fail('finance_officer cannot reject claims', e);
  }

  try {
    const auditor = await staffLogin('auditor@safe.local', QA_PASS);
    const reports = await apiRequest('/api/dashboard/support-reports', { token: auditor.token });
    const id = reports.reports?.[0]?.id;
    if (id) {
      await apiRequest(`/api/dashboard/support-reports/${id}`, {
        method: 'PATCH',
        token: auditor.token,
        body: { status: 'in_progress' },
        expectStatus: 403,
      });
    } else {
      await apiRequest('/api/dashboard/support-reports/none', {
        method: 'PATCH',
        token: auditor.token,
        body: { status: 'in_progress' },
        expectStatus: 403,
      });
    }
    pass('auditor cannot mutate support');
  } catch (e) {
    fail('auditor cannot mutate support', e);
  }

  try {
    const fleet = await staffLogin('fleet@safe.local', QA_PASS);
    await apiRequest('/api/dashboard/claims', { token: fleet.token, expectStatus: 403 });
    pass('fleet_manager cannot access claims list');
    const vehicles = await apiRequest('/api/dashboard/vehicles', { token: fleet.token });
    const vehicleId = vehicles.vehicles?.[0]?.id;
    if (vehicleId) {
      await apiRequest(`/api/dashboard/vehicles/${vehicleId}/qr`, { method: 'POST', token: fleet.token });
      pass('fleet_manager can generate QR');
    } else {
      pass('fleet_manager can access vehicles (no rows to QR)');
    }
  } catch (e) {
    fail('fleet_manager QR / claims isolation', e);
  }

  try {
    const claimsOfficer = await staffLogin('claims@safe.local', QA_PASS);
    const list = await apiRequest('/api/dashboard/claims', { token: claimsOfficer.token });
    const target = (list.claims || []).find((c) => c.status === 'approved') || list.claims?.[0];
    if (target) {
      await apiRequest(`/api/dashboard/claims/${target.id}`, {
        method: 'PATCH',
        token: claimsOfficer.token,
        body: { status: 'paid' },
        expectStatus: 403,
      });
      pass('claims_officer cannot mark paid');
    } else {
      pass('claims_officer cannot mark paid (no claims)');
    }
  } catch (e) {
    fail('claims_officer cannot mark paid', e);
  }

  try {
    const staff = await apiRequest('/api/dashboard/staff', { token: adminToken });
    const supers = (staff.staff || []).filter((u) => u.role === 'super_admin' && u.isActive);
    if (supers.length === 1) {
      await apiRequest(`/api/dashboard/staff/${supers[0].id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { isActive: false },
        expectStatus: 400,
      });
      pass('last super_admin cannot be deactivated');
    } else {
      pass('last super_admin guard (multiple supers)');
    }
  } catch (e) {
    fail('last super_admin cannot be deactivated', e);
  }

  try {
    const partner = await staffLogin('partner-external@safe.local', QA_PASS);
    await apiRequest('/api/dashboard/metrics', { token: partner.token, expectStatus: 403 });
    pass('transport_partner blocked from dashboard API (no global access)');
  } catch (e) {
    fail('transport_partner blocked from dashboard API', e);
  }

  try {
    const partnerLogin = await apiRequest('/api/shared/auth/login', {
      method: 'POST',
      body: { identifier: 'partner-external@safe.local', password: QA_PASS },
    });
    await apiRequest('/api/dashboard/session', { token: partnerLogin.token, expectStatus: 403 });
    pass('transport_partner blocked from dashboard session');
  } catch (e) {
    fail('transport_partner blocked from dashboard session', e);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nDashboard smoke: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
})();
