const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
  allowExitOnIdle: true,
});
pool.on("error", (error) =>
  console.error("Database connection error:", error.code || error.name),
);
module.exports = pool;
