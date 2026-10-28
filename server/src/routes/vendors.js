import { Router } from 'express';
import { getPool } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT v.VendorId, v.Name, v.Category, v.Country, v.Status,
             r.Score AS RiskScore, r.RiskLevel
      FROM Vendors v
      LEFT JOIN RiskAssessments r ON r.VendorId = v.VendorId
      ORDER BY v.Name`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

export default router;
