// Security tests. A fake token checker replaces Entra ID, so these run in CI with no
// Microsoft login and no database: every case is rejected before SQL is touched.
import request from 'supertest';
import { jest } from '@jest/globals';

// Replace the database module: if any test reached SQL, it would fail loudly.
jest.unstable_mockModule('../src/db.js', () => ({
  getPool: async () => { throw new Error('Tests must never reach the database'); },
  sql: {}
}));

let app;
let rankBids;

const claims = {
  admin:   { oid: '1', preferred_username: 'admin@test',   name: 'Admin',   scp: 'access_as_user', roles: ['Procurement.Admin'] },
  analyst: { oid: '2', preferred_username: 'analyst@test', name: 'Analyst', scp: 'access_as_user', roles: ['Procurement.Analyst'] },
  viewer:  { oid: '3', preferred_username: 'viewer@test',  name: 'Viewer',  scp: 'access_as_user', roles: ['Procurement.Viewer'] },
  norole:  { oid: '4', preferred_username: 'x@test',       name: 'X',       scp: 'access_as_user', roles: [] },
  noscope: { oid: '5', preferred_username: 'y@test',       name: 'Y',       scp: '',               roles: ['Procurement.Admin'] }
};

beforeAll(async () => {
  const auth = await import('../src/middleware/auth.js');
  auth.__setVerifier(async token => {
    if (!claims[token]) throw new Error('bad token');
    return claims[token];
  });
  app = (await import('../src/app.js')).default;
  ({ rankBids } = await import('../src/routes/rfx.js'));
});

const as = who => ({ Authorization: `Bearer ${who}` });

describe('authentication', () => {
  test('health is public', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });
  test('no token → 401', async () => {
    await request(app).get('/api/vendors').expect(401);
  });
  test('invalid token → 401', async () => {
    await request(app).get('/api/vendors').set(as('forged')).expect(401);
  });
  test('token without scope → 403', async () => {
    await request(app).get('/api/vendors').set(as('noscope')).expect(403);
  });
  test('/api/me returns the caller', async () => {
    const res = await request(app).get('/api/me').set(as('analyst')).expect(200);
    expect(res.body.roles).toEqual(['Procurement.Analyst']);
    expect(res.body.email).toBe('analyst@test');
  });
});

describe('authorization (RBAC)', () => {
  test('viewer cannot create', async () => {
    await request(app).post('/api/vendors').set(as('viewer'))
      .send({ name: 'Acme', category: 'Software', country: 'Canada' }).expect(403);
  });
  test('viewer cannot flag', async () => {
    await request(app).post('/api/vendors/1/flag').set(as('viewer')).send({ reason: 'testing' }).expect(403);
  });
  test('viewer cannot offboard', async () => {
    await request(app).delete('/api/vendors/1').set(as('viewer')).expect(403);
  });
  test('analyst cannot offboard (Admin only)', async () => {
    await request(app).delete('/api/vendors/1').set(as('analyst')).expect(403);
  });
  test('analyst passes the role check for create (then validation runs)', async () => {
    const res = await request(app).post('/api/vendors').set(as('analyst')).send({ name: 'A' }).expect(400);
    expect(res.body.details).toHaveProperty('name');
  });
  test('user with no role cannot read', async () => {
    await request(app).get('/api/vendors').set(as('norole')).expect(403);
  });
});

describe('validation', () => {
  test('bad vendor body → 400 with field errors', async () => {
    const res = await request(app).post('/api/vendors').set(as('admin')).send({ name: 'A' }).expect(400);
    expect(res.body.details).toHaveProperty('name');
  });
  test('non-numeric id → 400', async () => {
    await request(app).get('/api/vendors/abc').set(as('viewer')).expect(400);
  });
  test('expiring days out of range → 400', async () => {
    await request(app).get('/api/contracts/expiring?days=9999').set(as('viewer')).expect(400);
  });
  test('empty agent question → 400', async () => {
    await request(app).post('/api/agent').set(as('viewer')).send({ question: '' }).expect(400);
  });
  test('malformed JSON → 400', async () => {
    await request(app).post('/api/vendors').set(as('admin')).set('Content-Type', 'application/json')
      .send('{"name":').expect(400);
  });
});

describe('RFx', () => {
  test('viewer cannot award', async () => {
    await request(app).post('/api/rfx/1/award').set(as('viewer')).send({ vendorId: 1 }).expect(403);
  });
  test('analyst cannot award (Admin only)', async () => {
    await request(app).post('/api/rfx/1/award').set(as('analyst')).send({ vendorId: 1 }).expect(403);
  });
  test('award needs a numeric vendorId', async () => {
    await request(app).post('/api/rfx/1/award').set(as('admin')).send({ vendorId: 'x' }).expect(400);
  });
  test('bids need a valid RFx id', async () => {
    await request(app).get('/api/rfx/abc/bids').set(as('viewer')).expect(400);
  });
  test('bids are ranked 60% price / 40% risk', () => {
    const ranked = rankBids([
      { VendorName: 'Cheap but risky', PriceCAD: 100000, RiskScore: 80 },
      { VendorName: 'Pricier but safe', PriceCAD: 110000, RiskScore: 20 }
    ]);
    // cheap: 0.6*100 + 0.4*20 = 68 · safe: 0.6*90.9 + 0.4*80 = 86.5
    expect(ranked.map(b => b.VendorName)).toEqual(['Pricier but safe', 'Cheap but risky']);
    expect(ranked[0].totalScore).toBe(87);
    expect(ranked[1].totalScore).toBe(68);
  });
});

describe('demo mode', () => {
  const demo = { 'X-Demo-Mode': '1' };
  afterEach(() => { delete process.env.DEMO_MODE; });

  test('demo header is rejected when DEMO_MODE is off', async () => {
    await request(app).get('/api/me').set(demo).expect(401);
  });
  test('demo visitor is a Viewer', async () => {
    process.env.DEMO_MODE = 'true';
    const res = await request(app).get('/api/me').set(demo).expect(200);
    expect(res.body.roles).toEqual(['Procurement.Viewer']);
  });
  test('demo visitor cannot write', async () => {
    process.env.DEMO_MODE = 'true';
    await request(app).delete('/api/vendors/1').set(demo).expect(403);
  });
  test('demo visitor cannot use the agent by default', async () => {
    process.env.DEMO_MODE = 'true';
    await request(app).post('/api/agent').set(demo).send({ question: 'List vendors' }).expect(403);
  });
});

describe('errors', () => {
  test('unknown API path → 404 JSON', async () => {
    const res = await request(app).get('/api/nope').set(as('viewer')).expect(404);
    expect(res.body.error).toBe('Not found');
  });
});
