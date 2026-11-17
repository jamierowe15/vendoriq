-- Practice: run each query in SSMS and make sure you can explain the output.
USE VendorIQ;
GO

-- INNER JOIN: only vendors that have contracts
SELECT v.Name, c.Title, c.ValueCAD, c.EndDate
FROM Vendors v
INNER JOIN Contracts c ON c.VendorId = v.VendorId;

-- LEFT JOIN: every vendor, even with no contract (Woodgrove shows NULLs)
SELECT v.Name, c.Title
FROM Vendors v
LEFT JOIN Contracts c ON c.VendorId = v.VendorId;

-- The business question: high-risk contracts expiring in the next 60 days
SELECT v.Name, c.Title, c.EndDate, r.Score, r.RiskLevel
FROM Contracts c
JOIN Vendors v ON v.VendorId = c.VendorId
JOIN RiskAssessments r ON r.VendorId = v.VendorId
WHERE c.Status = 'Active'
  AND c.EndDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(day, 60, GETDATE())
ORDER BY r.Score DESC;

-- GROUP BY: total contract value per category
SELECT v.Category, COUNT(*) AS Contracts, SUM(c.ValueCAD) AS TotalCAD
FROM Vendors v JOIN Contracts c ON c.VendorId = v.VendorId
GROUP BY v.Category
ORDER BY TotalCAD DESC;

-- Transaction practice: change, look, then undo
BEGIN TRAN;
UPDATE Vendors SET Status = 'Under Review' WHERE VendorId = 4;
SELECT * FROM Vendors WHERE VendorId = 4;
ROLLBACK;

-- Audit trail: who did what
SELECT TOP 20 * FROM AuditLog ORDER BY LogId DESC;
