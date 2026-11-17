-- AZURE SQL. Run in SSMS while connected to your Azure server with the VendorIQ database
-- selected (Azure SQL works per database, so there is no CREATE DATABASE or USE here).

CREATE TABLE Vendors (
    VendorId     INT IDENTITY(1,1) PRIMARY KEY,
    Name         NVARCHAR(200) NOT NULL,
    Category     NVARCHAR(100) NOT NULL,
    Country      NVARCHAR(100) NOT NULL,
    ContactEmail NVARCHAR(200) NULL,
    Status       NVARCHAR(20)  NOT NULL DEFAULT 'Active'
                 CHECK (Status IN ('Active','Under Review','Offboarded')),
    CreatedAt    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Contracts (
    ContractId INT IDENTITY(1,1) PRIMARY KEY,
    VendorId   INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    Title      NVARCHAR(200) NOT NULL,
    ValueCAD   DECIMAL(12,2) NOT NULL,
    StartDate  DATE NOT NULL,
    EndDate    DATE NOT NULL,
    Status     NVARCHAR(20) NOT NULL DEFAULT 'Active'
               CHECK (Status IN ('Draft','Active','Expired','Terminated')),
    CONSTRAINT CK_Contract_Dates CHECK (EndDate > StartDate)
);

CREATE TABLE RiskAssessments (
    AssessmentId INT IDENTITY(1,1) PRIMARY KEY,
    VendorId     INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    Score        INT NOT NULL CHECK (Score BETWEEN 1 AND 100),
    RiskLevel    NVARCHAR(10) NOT NULL CHECK (RiskLevel IN ('Low','Medium','High')),
    Notes        NVARCHAR(1000) NULL,
    AssessedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Who did what: regulated organizations (banks) require an audit trail
CREATE TABLE AuditLog (
    LogId     INT IDENTITY(1,1) PRIMARY KEY,
    UserEmail NVARCHAR(200) NOT NULL,
    Action    NVARCHAR(50)  NOT NULL,
    Entity    NVARCHAR(50)  NOT NULL,
    EntityId  INT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Sourcing (RFx) events and the bids vendors submit
CREATE TABLE RfxEvents (
    RfxId           INT IDENTITY(1,1) PRIMARY KEY,
    Title           NVARCHAR(200) NOT NULL,
    Category        NVARCHAR(100) NOT NULL,
    Status          NVARCHAR(20)  NOT NULL DEFAULT 'Open'
                    CHECK (Status IN ('Open','Closed','Awarded')),
    DueDate         DATE NOT NULL,
    AwardedVendorId INT NULL FOREIGN KEY REFERENCES Vendors(VendorId)
);

CREATE TABLE Bids (
    BidId         INT IDENTITY(1,1) PRIMARY KEY,
    RfxId         INT NOT NULL FOREIGN KEY REFERENCES RfxEvents(RfxId),
    VendorId      INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    PriceCAD      DECIMAL(12,2) NOT NULL CHECK (PriceCAD > 0),
    DeliveryWeeks INT NOT NULL CHECK (DeliveryWeeks > 0),
    SubmittedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Bid UNIQUE (RfxId, VendorId) -- one bid per vendor per RFx
);

CREATE INDEX IX_Contracts_EndDate ON Contracts(EndDate);
CREATE INDEX IX_Risk_Vendor ON RiskAssessments(VendorId, AssessedAt DESC);
GO


-- Fictional sample data
INSERT INTO Vendors (Name, Category, Country, ContactEmail, Status) VALUES
('Northwind Cloud',       'Cloud Hosting',     'Canada', 'sales@northwind.example', 'Active'),
('Contoso Payroll',       'HR / Payroll SaaS', 'USA',    'ap@contoso.example',      'Active'),
('Fabrikam Security',     'Cybersecurity',     'Canada', 'info@fabrikam.example',   'Under Review'),
('Tailspin Analytics',    'Data Analytics',    'UK',     'hello@tailspin.example',  'Active'),
('Litware Print',         'Facilities',        'Canada', 'orders@litware.example',  'Active'),
('Adatum Consulting',     'Consulting',        'India',  'bd@adatum.example',       'Active'),
('Proseware Telecom',     'Telecom',           'Canada', 'b2b@proseware.example',   'Under Review'),
('Woodgrove Data Centre', 'Cloud Hosting',     'USA',    'dc@woodgrove.example',    'Offboarded');

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

INSERT INTO RfxEvents (Title, Category, DueDate)
VALUES ('Managed Cloud Backup Services', 'Cloud Hosting', DATEADD(day, 14, GETDATE()));

INSERT INTO Bids (RfxId, VendorId, PriceCAD, DeliveryWeeks) VALUES
(1, 1, 210000, 6),  -- Northwind Cloud: mid price, low risk
(1, 4, 165000, 8),  -- Tailspin Analytics: cheapest, medium risk
(1, 7, 180000, 4);  -- Proseware Telecom: fast, high risk
GO

-- The app's own contained user (no server login on Azure). Use a strong password and
-- store the same value in Key Vault as DbPassword.
CREATE USER vendoriq_app WITH PASSWORD = '<Strong_App_Pass1!>';
ALTER ROLE db_datareader ADD MEMBER vendoriq_app;
ALTER ROLE db_datawriter ADD MEMBER vendoriq_app;
GO
