// One shared SQL Server connection pool for the whole app.
import sql from 'mssql';
import 'dotenv/config';

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'VendorIQ',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    instanceName: process.env.DB_INSTANCE || undefined, // e.g. SQLEXPRESS locally; empty on Azure
    encrypt: process.env.DB_ENCRYPT === 'true',          // true on Azure SQL
    trustServerCertificate: process.env.DB_ENCRYPT !== 'true'
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise;

export function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config).catch(err => {
      poolPromise = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return poolPromise;
}

export { sql };
