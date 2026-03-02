import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { sql } from "../db.js";
import { getWalletBalance } from "../coinApi.js";

const router = Router();

// 내 포트폴리오
// GET /portfolio
router.get("/portfolio", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const holdings = await sql`
      SELECT
        o.company_id,
        o.quantity,
        c.name as company_name,
        c.logo_emoji,
        c.status as company_status,
        c.asset_type_id,
        at.symbol as coin_symbol,
        mp.current_price,
        mp.prev_price,
        CASE WHEN mp.prev_price > 0
          THEN ROUND(((mp.current_price - mp.prev_price) / mp.prev_price * 100)::numeric, 2)
          ELSE 0 END as change_rate,
        (o.quantity * mp.current_price)::numeric as current_value,
        avg_buy.avg_price as avg_buy_price,
        CASE WHEN avg_buy.avg_price > 0
          THEN (o.quantity * mp.current_price - o.quantity * avg_buy.avg_price)::numeric
          ELSE 0 END as profit_loss,
        CASE WHEN avg_buy.avg_price > 0
          THEN ROUND(((mp.current_price - avg_buy.avg_price) / avg_buy.avg_price * 100)::numeric, 2)
          ELSE 0 END as profit_rate
      FROM investment.ownership o
      JOIN investment.companies c ON o.company_id = c.id
      JOIN economy.asset_types at ON c.asset_type_id = at.id
      LEFT JOIN investment.market_price mp ON o.company_id = mp.company_id
      LEFT JOIN (
        SELECT company_id, AVG(price)::numeric as avg_price
        FROM investment.trades
        WHERE buyer_id = ${user.userId}::uuid
        GROUP BY company_id
      ) avg_buy ON o.company_id = avg_buy.company_id
      WHERE o.user_id = ${user.userId}::uuid AND o.quantity > 0
      ORDER BY current_value DESC NULLS LAST
    `;

    // 총 평가액
    const totalValue = holdings.reduce((s: number, h: any) =>
      s + parseFloat(h.current_value || "0"), 0);
    const totalPnL = holdings.reduce((s: number, h: any) =>
      s + parseFloat(h.profit_loss || "0"), 0);

    res.json({ holdings, totalValue, totalPnL });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 특정 회사에서 내 보유 주식
// GET /portfolio/company/:companyId
router.get("/portfolio/company/:companyId", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const companyId = parseInt(req.params.companyId);

    const [ownership, companyWallet] = await Promise.all([
      sql`
        SELECT quantity FROM investment.ownership
        WHERE user_id = ${user.userId}::uuid AND company_id = ${companyId}
      `,
      sql`
        SELECT c.name, c.asset_type_id, at.symbol
        FROM investment.companies c
        JOIN economy.asset_types at ON c.asset_type_id = at.id
        WHERE c.id = ${companyId}
      `,
    ]);

    const company = companyWallet[0];
    let walletBalance = { balance: 0 };
    if (company) {
      walletBalance = await getWalletBalance(`company:${companyId}`, company.asset_type_id);
    }

    res.json({
      quantity: ownership[0]?.quantity || 0,
      companyWallet: {
        balance: walletBalance.balance,
        symbol: company?.symbol,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
