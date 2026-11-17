-- LOCAL ONLY. Run once in SSMS against localhost\SQLEXPRESS.
-- Creates the SQL login the API uses. Change the password, and use the same one in server/.env.
USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'vendoriq_app')
    CREATE LOGIN vendoriq_app WITH PASSWORD = 'Change_Me_123!', CHECK_POLICY = ON;
GO
