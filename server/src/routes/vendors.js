import { Router } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../db.js';
import { validate, parseId } from '../middleware/validate.js';
import { audit } from '../audit.js';

const router = Router();

// The rules every new or updated vendor must follow
const vendorSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100),
  contactEmail: z.string().email().optional(),
  status: z.enum(['Active', 'Under Review', 'Offboarded']).default('Active')
});

// GET /api/vendors?search=cloud
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${req.query.search || ''}%`)
      .query(`SELECT v.VendorId, v.Name, v.Category, v.Country, v.Status,
                     r.Score AS RiskScore, r.RiskLevel
              FROM Vendors v
              LEFT JOIN RiskAssessments r ON r.VendorId = v.VendorId
              WHERE v.Name LIKE @search
              ORDER BY v.Name`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET /api/vendors/:id  (vendor + contracts + latest risk)
router.get('/:id', parseId, async (req, res, next) => {
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

// POST /api/vendors
router.post('/', validate(vendorSchema), async (req, res, next) => {
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

// PUT /api/vendors/:id
router.put('/:id', parseId, validate(vendorSchema), async (req, res, next) => {
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
      .query(`UPDATE Vendors SET Name=@name, Category=@category, Country=@country,
                     ContactEmail=@email, Status=@status
              OUTPUT INSERTED.*
              WHERE VendorId = @id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Vendor not found' });
    await audit(req, 'UPDATE', 'Vendor', req.id);
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

// DELETE /api/vendors/:id  (soft delete: status → Offboarded)
router.delete('/:id', parseId, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, req.id)
      .query(`UPDATE Vendors SET Status = 'Offboarded' WHERE VendorId = @id`);
    if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Vendor not found' });
    await audit(req, 'OFFBOARD', 'Vendor', req.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

