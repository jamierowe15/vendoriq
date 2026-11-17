import { Router } from 'express';
import { getPool, sql } from '../db.js';
import { canRead } from '../middleware/auth.js';

const router = Router();

// GET /api/contracts/expiring?days=60
// Defined before any /:id route, so Express never treats "expiring" as an id.
router.get('/expiring', canRead, async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 60);
    if (!Number.isInteger(days) || days < 1 || days > 730) {
      return res.status(400).json({ error: 'days must be a whole number from 1 to 730' });
    }
    const pool = await getPool();
    const result = await pool.request().input('days', sql.Int, days).query(`
      SELECT c.ContractId, c.Title, c.ValueCAD, c.EndDate, v.VendorId, v.Name AS VendorName,
             r.Score AS RiskScore, r.RiskLevel
      FROM Contracts c
      JOIN Vendors v ON v.VendorId = c.VendorId
      OUTER APPLY (SELECT TOP 1 Score, RiskLevel FROM RiskAssessments
                   WHERE VendorId = v.VendorId ORDER BY AssessedAt DESC) r
      WHERE c.Status = 'Active'
        AND c.EndDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(day, @days, GETDATE())
      ORDER BY c.EndDate`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

export default router;
