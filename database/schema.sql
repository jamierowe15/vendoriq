CREATE DATABASE VendorIQ;
GO
USE VendorIQ;
GO

CREATE TABLE Vendors (
  VendorId     INT IDENTITY(1,1) PRIMARY KEY,
  Name         NVARCHAR(200) NOT NULL,
  Category     NVARCHAR(100) NOT NULL,
  Country      NVARCHAR(100) NOT NULL,
  ContactEmail NVARCHAR(200) NULL,
  Status       NVARCHAR(20)  NOT NULL DEFAULT 'Active'
               CHECK (Status IN ('Active','Under Review','Offboarded')),
  CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
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

-- Who did what: regulated orgs (banks) require an audit trail
CREATE TABLE AuditLog (
  LogId     INT IDENTITY(1,1) PRIMARY KEY,
  UserEmail NVARCHAR(200) NOT NULL,
  Action    NVARCHAR(50) NOT NULL,
  Entity    NVARCHAR(50) NOT NULL,
  EntityId  INT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_Contracts_EndDate ON Contracts(EndDate);
GO

-- Least privilege: the app can read/write data but not change the schema
CREATE USER vendoriq_app FOR LOGIN vendoriq_app;
ALTER ROLE db_datareader ADD MEMBER vendoriq_app;
ALTER ROLE db_datawriter ADD MEMBER vendoriq_app;
