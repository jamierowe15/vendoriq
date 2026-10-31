import { getPool, sql } from './db.js';

// Writes one row to AuditLog: who did what to which record.
export async function audit(req, action, entity, entityId) {
  const pool = await getPool();
  await pool.request()
    .input('email', sql.NVarChar, req.user?.email || 'anonymous') // real email arrives on Day 3
    .input('action', sql.NVarChar, action)
    .input('entity', sql.NVarChar, entity)
    .input('id', sql.Int, entityId ?? null)
    .query(`INSERT INTO AuditLog (UserEmail, Action, Entity, EntityId)
            VALUES (@email, @action, @entity, @id)`);
}

