// Authentication (who are you?) and authorization (what may you do?).
// Every /api route except /api/health passes through requireAuth.
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const ROLES = {
  ADMIN: 'Procurement.Admin',     // everything, including offboarding vendors and awarding RFx
  ANALYST: 'Procurement.Analyst', // create, edit and flag vendors
  VIEWER: 'Procurement.Viewer'    // read-only
};

let JWKS;
async function defaultVerify(token) {
  const tenant = process.env.TENANT_ID;
  if (!tenant || !process.env.API_CLIENT_ID) throw new Error('TENANT_ID / API_CLIENT_ID not set');
  JWKS ??= createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`));
  // Checks the signature (Microsoft's public keys), issuer, audience and expiry.
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    audience: process.env.API_CLIENT_ID
  });
  return payload;
}

let verify = defaultVerify;
export const __setVerifier = fn => { verify = fn; }; // tests swap in a fake checker

const DEMO_USER = { id: 'demo', email: 'demo@vendoriq', name: 'Demo visitor', roles: [ROLES.VIEWER], demo: true };

export async function requireAuth(req, res, next) {
  // Optional public demo: read-only Viewer, switched on with DEMO_MODE=true.
  if (process.env.DEMO_MODE === 'true' && req.headers['x-demo-mode'] === '1') {
    req.user = DEMO_USER;
    return next();
  }

  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Missing bearer token' });

  let claims;
  try {
    claims = await verify(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const scopes = (claims.scp || '').split(' ');
  if (!scopes.includes('access_as_user')) return res.status(403).json({ error: 'Missing required scope' });

  req.user = {
    id: claims.oid,
    email: claims.preferred_username,
    name: claims.name,
    roles: claims.roles || []
  };
  next();
}

export const requireRole = (...allowed) => (req, res, next) =>
  req.user?.roles.some(r => allowed.includes(r))
    ? next()
    : res.status(403).json({ error: `Requires role: ${allowed.join(' or ')}` });

export const canRead = requireRole(ROLES.ADMIN, ROLES.ANALYST, ROLES.VIEWER);
export const canEdit = requireRole(ROLES.ADMIN, ROLES.ANALYST);
export const canAdmin = requireRole(ROLES.ADMIN);

export const userCanEdit = user => user.roles.some(r => r === ROLES.ADMIN || r === ROLES.ANALYST);
export const userIsAdmin = user => user.roles.includes(ROLES.ADMIN);
