-- LOCAL. Creates the VendorIQ database, tables and the least-privilege app user.
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

-- Least privilege: the app can read and write data, but cannot change the schema
CREATE USER vendoriq_app FOR LOGIN vendoriq_app;
ALTER ROLE db_datareader ADD MEMBER vendoriq_app;
ALTER ROLE db_datawriter ADD MEMBER vendoriq_app;
GO
