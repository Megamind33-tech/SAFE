/**
 * Post-deploy smoke against live staging URLs (no Playwright).
 *
 * Required:
 *   STAGING_API_URL=https://api.staging.example
 *
 * Optional:
 *   STAGING_MOBILE_URL=https://app.staging.example
 *   STAGING_DASHBOARD_URL=https://admin.staging.example
 *   STAGING_ADMIN_EMAIL / STAGING_ADMIN_PASSWORD — dashboard login + session tests
 */
const API = (process.env.STAGING_API_URL || '').replace(/\/$/, '');
const MOBILE = (process.env.STAGING_MOBILE_URL || '').replace(/\/$/, '');
const DASHBOARD = (process.env.STAGING_DASHBOARD_URL || '').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.STAGING_ADMIN_PASSWORD;

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
  console.log('PASS', name);
}

function fail(name, err) {
  checks.push({ name, ok: false, err: String(err) });
  console.error('FAIL', name, err);
}

async function api(pathname, { method = 'GET', token, body, expectStatus } = {}) {
  const res = await fetch(`${API}${pathname}`, {
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
      throw new Error(`${pathname} expected ${expectStatus} got ${res.status}: ${data?.error || res.status}`);
    }
    return { res, data };
  }
  if (!res.ok) throw new Error(`${pathname} → ${data?.error || res.status}`);
  return { res, data };
}

(async () => {
  if (!API) {
    console.error('STAGING_API_URL is required.');
    process.exit(1);
  }

  try {
    const { data } = await api('/health');
    if (!data?.ok) throw new Error('health body missing ok:true');
    pass('API health');
  } catch (e) {
    fail('API health', e);
  }

  try {
    await api('/api/dashboard/metrics', { expectStatus: 401 });
    pass('dashboard requires auth');
  } catch (e) {
    fail('dashboard requires auth', e);
  }

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    try {
      const { data: login } = await api('/api/shared/auth/login', {
        method: 'POST',
        body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      if (login.user?.role === 'transport_partner' || login.user?.role === 'insurance_partner') {
        throw new Error('partner role must not be used for dashboard login');
      }
      const { data: session } = await api('/api/dashboard/session', { token: login.token });
      if (!session.permissions?.includes('dashboard.view')) {
        throw new Error('staging admin missing dashboard.view');
      }
      if (!session.permissions?.includes('staff.manage')) {
        throw new Error('staging super_admin should have staff.manage');
      }
      await api('/api/dashboard/overview', { token: login.token });
      pass('staging admin login + dashboard session');
    } catch (e) {
      fail('staging admin login + dashboard session', e);
    }
  } else {
    console.log('SKIP staging admin login (set STAGING_ADMIN_EMAIL + STAGING_ADMIN_PASSWORD)');
  }

  if (MOBILE) {
    try {
      const res = await fetch(`${MOBILE}/`);
      const html = await res.text();
      if (!res.ok) throw new Error(`mobile root ${res.status}`);
      if (!html.includes('id="root"') && !html.includes("id='root'")) {
        throw new Error('mobile root HTML missing #root (not SPA shell?)');
      }
      pass('mobile SPA shell loads');
    } catch (e) {
      fail('mobile SPA shell loads', e);
    }

    try {
      const res = await fetch(`${MOBILE}/q/SAFE-SMOKE-ROUTE-CHECK`);
      const html = await res.text();
      if (res.status === 404) {
        throw new Error('/q/* returned 404 — configure SPA rewrite on mobile host');
      }
      if (!html.includes('id="root"') && !html.includes("id='root'")) {
        throw new Error('/q/* did not return SPA shell');
      }
      pass('mobile /q/* rewrite (SPA fallback)');
    } catch (e) {
      fail('mobile /q/* rewrite', e);
    }
  } else {
    console.log('SKIP mobile checks (set STAGING_MOBILE_URL)');
  }

  if (DASHBOARD) {
    try {
      const res = await fetch(`${DASHBOARD}/`);
      const html = await res.text();
      if (!res.ok) throw new Error(`dashboard ${res.status}`);
      if (!html.includes('id="root"')) {
        throw new Error('dashboard missing #root');
      }
      pass('dashboard SPA shell loads');
    } catch (e) {
      fail('dashboard SPA shell loads', e);
    }
  } else {
    console.log('SKIP dashboard shell check (set STAGING_DASHBOARD_URL)');
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nStaging remote smoke: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
})();
