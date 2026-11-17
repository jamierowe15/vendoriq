// Vendor endpoints. Every value goes through .input(), so every query is parameterized.
// Order on each route: role check → id/body validation → database.
import { Router } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../db.js';
import { validate, parseId } from '../middleware/validate.js';
import { canRead, canEdit, canAdmin } from '../middleware/auth.js';
import { audit } from '../audit.js';
import { notify } from '../notify.js';

const router = Router();

const vendorSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().email().max(200).optional(),
  status: z.enum(['Active', 'Under Review', 'Offboarded']).default('Active')
});

const flagSchema = z.object({ reason: z.string().trim().min(5).max(500) });

// GET /api/vendors?search=cloud
router.get('/', canRead, async (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').slice(0, 100);
    const pool = await getPool();
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .query(`SELECT v.VendorId, v.Name, v.Category, v.Country, v.Status,
                     r.Score AS RiskScore, r.RiskLevel
              FROM Vendors v
              OUTER APPLY (SELECT TOP 1 Score, RiskLevel FROM RiskAssessments
                           WHERE VendorId = v.VendorId ORDER BY AssessedAt DESC) r
              WHERE v.Name LIKE @search
              ORDER BY v.Name`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET /api/vendors/:id  → vendor + contracts + latest risk assessment
router.get('/:id', canRead, parseId, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, req.id).query(`
      SELECT * FROM Vendors WHERE VendorId = @id;
      SELECT * FROM Contracts WHERE VendorId = @id ORDER BY EndDate;
      SELECT TOP 1 * FROM RiskAssessments WHERE VendorId = @id ORDER BY AssessedAt DESC;`);
    const [vendors, contracts, risk] = result.recordsets;
    if (!vendors.length) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ ...vendors[0], contracts, risk: risk[0] || null });
  } catch (err) { next(err); }
});

// POST /api/vendors  (Admin or Analyst)
router.post('/', canEdit, validate(vendorSchema), async (req, res, next) => {
  try {
    const { name, category, country, contactEmail, status } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('category', sql.NVarChar, category)
      .input('country', sql.NVarChar, country)
      .input('email', sql.NVarChar, contactEmail ?? null)
      .input('status', sql.NVarChar, status)
      .query(`INSERT INTO Vendors (Name, Category, Country, ContactEmail, Status)
              OUTPUT INSERTED.*
              VALUES (@name, @category, @country, @email, @status)`);
    const created = result.recordset[0];
    await audit(req, 'CREATE', 'Vendor', created.VendorId);
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/vendors/:id  (Admin or Analyst)
router.put('/:id', canEdit, parseId, validate(vendorSchema), async (req, res, next) => {
  try {
    const { name, category, country, contactEmail, status } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.id)
      .input('name', sql.NVarChar, name)
      .input('category', sql.NVarChar, category)
      .input('country', sql.NVarChar, country)
      .input('email', sql.NVarChar, contactEmail ?? null)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE Vendors SET Name = @name, Category = @category, Country = @country,
                     ContactEmail = @email, Status = @status
              OUTPUT INSERTED.*
              WHERE VendorId = @id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Vendor not found' });
    await audit(req, 'UPDATE', 'Vendor', req.id);
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

// DELETE /api/vendors/:id  (Admin only) — soft delete: status becomes Offboarded
router.delete('/:id', canAdmin, parseId, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, req.id)
      .query(`UPDATE Vendors SET Status = 'Offboarded' WHERE VendorId = @id`);
    if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Vendor not found' });
    await audit(req, 'OFFBOARD', 'Vendor', req.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// POST /api/vendors/:id/flag  (Admin or Analyst) — set Under Review with a reason
router.post('/:id/flag', canEdit, parseId, validate(flagSchema), async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.id)
      .query(`UPDATE Vendors SET Status = 'Under Review' OUTPUT INSERTED.* WHERE VendorId = @id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Vendor not found' });
    const vendor = result.recordset[0];
    await audit(req, 'FLAG', 'Vendor', req.id);
    notify(`:warning: *${vendor.Name}* flagged for review by ${req.user.email}: ${req.body.reason}`);
    res.json({ ...vendor, flaggedReason: req.body.reason });
  } catch (err) { next(err); }
});

export default router;
