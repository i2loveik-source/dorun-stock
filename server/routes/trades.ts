import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { sql } from "../db.js";

const router = Router();

// 체결 내역 (최근 50건)
// GET /trades/:companyId
router.get("/trades/:companyId", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const trades = await sql`
      SELECT t.*,
             bu.username as buyer_name,
             su.username as seller_name
      FROM investment.trades t
      LEFT JOIN public.users bu ON t.buyer_id = bu.id
      LEFT JOIN public.users su ON t.seller_id = su.id
      WHERE t.company_id = ${companyId}
      ORDER BY t.executed_at DESC LIMIT 50
    `;
    res.json(trades);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 캔들 차트 데이터 (1분 봉)
// GET /trades/:companyId/candles?interval=1m&limit=60
router.get("/trades/:companyId/candles", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const interval = (req.query.interval as string) || "5m";
    const limit = Math.min(200, parseInt(req.query.limit as string) || 60);

    // interval → PostgreSQL date_trunc 단위
    const trunc = interval === "1m" ? "minute"
      : interval === "5m" ? "minute"  // 5분은 별도 처리
      : interval === "1h" ? "hour"
      : interval === "1d" ? "day"
      : "minute";

    const minuteGroup = interval === "5m" ? 5 : interval === "15m" ? 15 : 1;

    const candles = await sql`
      SELECT
        date_trunc(${trunc}, executed_at) +
          (EXTRACT(MINUTE FROM executed_at)::int / ${minuteGroup} * ${minuteGroup} || ' minutes')::interval as time,
        (array_agg(price ORDER BY executed_at ASC))[1]::numeric as open,
        MAX(price)::numeric as high,
        MIN(price)::numeric as low,
        (array_agg(price ORDER BY executed_at DESC))[1]::numeric as close,
        SUM(quantity)::int as volume
      FROM investment.trades
      WHERE company_id = ${companyId}
        AND executed_at > NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT ${limit}
    `;
    res.json(candles.reverse());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
