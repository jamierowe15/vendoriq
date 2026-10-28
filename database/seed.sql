USE VendorIQ;

INSERT INTO Vendors (Name, Category, Country, ContactEmail, Status) VALUES
('Northwind Cloud',      'Cloud Hosting',     'Canada', 'sales@northwind.example', 'Active'),
('Contoso Payroll',      'HR / Payroll SaaS', 'USA',    'ap@contoso.example',      'Active'),
('Fabrikam Security',    'Cybersecurity',     'Canada', 'info@fabrikam.example',   'Under Review'),
('Tailspin Analytics',   'Data Analytics',    'UK',     'hello@tailspin.example',  'Active'),
('Litware Print',        'Facilities',        'Canada', 'orders@litware.example',  'Active'),
('Adatum Consulting',    'Consulting',        'India',  'bd@adatum.example',       'Active'),
('Proseware Telecom',    'Telecom',           'Canada', 'b2b@proseware.example',   'Under Review'),
('Woodgrove Data Centre','Cloud Hosting',     'USA',    'dc@woodgrove.example',    'Offboarded');

INSERT INTO Contracts (VendorId, Title, ValueCAD, StartDate, EndDate, Status) VALUES
(1, 'IaaS Master Services Agreement', 480000, DATEADD(year,-2,GETDATE()),  DATEADD(day, 45, GETDATE()),  'Active'),
(2, 'Payroll Platform Subscription',  120000, DATEADD(year,-1,GETDATE()),  DATEADD(day, 20, GETDATE()),  'Active'),
(3, 'Managed SOC Services',           350000, DATEADD(month,-6,GETDATE()), DATEADD(day, 300, GETDATE()), 'Active'),
(4, 'BI Licensing',                    60000, DATEADD(year,-1,GETDATE()),  DATEADD(day, 90, GETDATE()),  'Active'),
(5, 'Branch Printing Services',        25000, DATEADD(year,-3,GETDATE()),  DATEADD(day, -10, GETDATE()), 'Expired'),
(6, 'Core Banking Advisory',          200000, DATEADD(month,-2,GETDATE()), DATEADD(day, 400, GETDATE()), 'Active'),
(7, 'WAN Connectivity',               150000, DATEADD(year,-2,GETDATE()),  DATEADD(day, 55, GETDATE()),  'Active');

INSERT INTO RiskAssessments (VendorId, Score, RiskLevel, Notes) VALUES
(1, 35, 'Low',    'SOC 2 Type II current'),
(2, 72, 'High',   'Handles employee PII; data stored outside Canada'),
(3, 64, 'Medium', 'Pending penetration test results'),
(4, 48, 'Medium', 'Sub-processor list outdated'),
(5, 15, 'Low',    'No data access'),
(6, 55, 'Medium', 'Offshore delivery team'),
(7, 81, 'High',   'Recent outage; BCP plan not provided');
