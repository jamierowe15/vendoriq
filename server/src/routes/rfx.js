// RFx (sourcing events) and bids. Scoring is a transparent formula computed in code,
// so the AI agent explains the numbers instead of inventing them.
import { Router } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../db.js';
import { canRead, canAdmin } from '../middleware/auth.js';
import { validate, parseId } from '../middleware/validate.js';
import { audit } from '../audit.js';
import { notify } from '../notify.js';

const router = Router();
export const PRICE_WEIGHT = 0.6;
export const RISK_WEIGHT = 0.4;

// Pure function: easy to unit test.
export function rankBids(bids) {
  const lowest = Math.min(...bids.map(b => Number(b.PriceCAD)));
  return bids.map(b => {
    const priceScore = (lowest / Number(b.PriceCAD)) * 100; // cheapest bid = 100
    const riskScore = 100 - (b.RiskScore ?? 50);           // lower risk = higher score
    const total = PRICE_WEIGHT * priceScore + RISK_WEIGHT * riskScore;
    return { ...b, priceScore: Math.round(priceScore), riskScore, totalScore: Math.round(total) };
  }).sort((a, b) => b.totalScore - a.totalScore);
}

// GET /api/rfx
router.get('/', canRead, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT e.*, v.Name AS AwardedVendorName,
             (SELECT COUNT(*) FROM Bids b WHERE b.RfxId = e.RfxId) AS BidCount
      FROM RfxEvents e
      LEFT JOIN Vendors v ON v.VendorId = e.AwardedVendorId
      ORDER BY e.DueDate`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET /api/rfx/:id/bids → bids ranked by weighted score
router.get('/:id/bids', canRead, parseId, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, req.id).query(`
      SELECT b.BidId, b.PriceCAD, b.DeliveryWeeks, v.VendorId, v.Name AS VendorName,
             v.Status AS VendorStatus, r.Score AS RiskScore, r.RiskLevel
      FROM Bids b
      JOIN Vendors v ON v.VendorId = b.VendorId
      OUTER APPLY (SELECT TOP 1 Score, RiskLevel FROM RiskAssessments
                   WHERE VendorId = v.VendorId ORDER BY AssessedAt DESC) r
      WHERE b.RfxId = @id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'No bids for this RFx' });
    res.json({ weights: { price: PRICE_WEIGHT, risk: RISK_WEIGHT }, bids: rankBids(result.recordset) });
  } catch (err) { next(err); }
});

const awardSchema = z.object({ vendorId: z.number().int().positive() });

// POST /api/rfx/:id/award  (Admin only). 409 when the business rule fails.
router.post('/:id/award', canAdmin, parseId, validate(awardSchema), async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.id)
      .input('vendorId', sql.Int, req.body.vendorId)
      .query(`UPDATE e SET Status = 'Awarded', AwardedVendorId = @vendorId
              OUTPUT INSERTED.*
              FROM RfxEvents e
              WHERE e.RfxId = @id AND e.Status <> 'Awarded'
                AND EXISTS (SELECT 1 FROM Bids b WHERE b.RfxId = @id AND b.VendorId = @vendorId)`);
    if (!result.recordset.length) {
      return res.status(409).json({ error: 'RFx not found, already awarded, or vendor did not bid' });
    }
    await audit(req, 'AWARD', 'RFx', req.id);
    notify(`:trophy: RFx ${req.id} awarded to vendor ${req.body.vendorId} by ${req.user.email}`);
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

export default router;
