// Every write is recorded: who, what, which record, when.
import { getPool, sql } from './db.js';

export async function audit(req, action, entity, entityId) {
  const pool = await getPool();
  await pool.request()
    .input('email', sql.NVarChar, req.user?.email || 'anonymous')
    .input('action', sql.NVarChar, action)
    .input('entity', sql.NVarChar, entity)
    .input('id', sql.Int, entityId ?? null)
    .query(`INSERT INTO AuditLog (UserEmail, Action, Entity, EntityId)
            VALUES (@email, @action, @entity, @id)`);
}
