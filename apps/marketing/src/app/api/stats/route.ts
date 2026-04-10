import { NextResponse } from "next/server";

export const revalidate = 300; // cache 5 minutes

interface StatsRow {
  proposals: number;
  warrants: number;
  audit_events: number;
  policies: number;
}

const FALLBACK: StatsRow = {
  proposals: 94,
  warrants: 75,
  audit_events: 252,
  policies: 10,
};

export async function GET() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    return NextResponse.json(FALLBACK);
  }

  try {
    // Dynamic import to avoid bundling pg in client
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    try {
      const { rows } = await client.query<StatsRow>(`
        SELECT
          (SELECT COUNT(*)::int FROM regulator.proposals) AS proposals,
          (SELECT COUNT(*)::int FROM regulator.warrants) AS warrants,
          (SELECT COUNT(*)::int FROM regulator.audit_events) AS audit_events,
          (SELECT COUNT(*)::int FROM regulator.policies) AS policies
      `);
      return NextResponse.json(rows[0] || FALLBACK);
    } finally {
      client.release();
      await pool.end();
    }
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
