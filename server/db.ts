import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL!;

// 단순 쿼리용 (serverless neon)
export const sql = neon(DATABASE_URL);

// 트랜잭션용 (pg Pool)
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});
