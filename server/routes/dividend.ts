import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { sql } from "../db.js";
import { transferCoin, getWalletBalance } from "../coinApi.js";

const router = Router();

// 배당 실행 (관리자)
// POST /dividend
router.post("/dividend", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!["관리자", "org_issuer", "platform_admin"].includes(user.role)) {
      return res.status(403).json({ error: "관리자만 배당을 실행할 수 있습니다" });
    }

    const { companyId, totalAmount, memo } = req.body;
    if (!companyId || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: "companyId, totalAmount 필수" });
    }

    // 회사 정보 확인
    const companies = await sql`
      SELECT c.*, at.symbol FROM investment.companies c
      JOIN economy.asset_types at ON c.asset_type_id = at.id
      WHERE c.id = ${companyId}
    `;
    if (!companies[0]) return res.status(404).json({ error: "회사 없음" });
    const company = companies[0];

    // 회사 지갑 잔액 확인
    const companyWallet = await getWalletBalance(`company:${companyId}`, company.asset_type_id);
    if (parseFloat(companyWallet.balance || "0") < totalAmount) {
      return res.status(400).json({
        error: `회사 지갑 잔액 부족 (보유: ${companyWallet.balance} ${company.symbol}, 필요: ${totalAmount})`,
      });
    }

    // 주주 목록 조회
    const shareholders = await sql`
      SELECT user_id::text, quantity,
             quantity::float / totals.total AS ratio
      FROM investment.ownership
      CROSS JOIN (
        SELECT SUM(quantity)::float as total
        FROM investment.ownership
        WHERE company_id = ${companyId} AND quantity > 0
      ) totals
      WHERE company_id = ${companyId} AND quantity > 0
    `;
    if (shareholders.length === 0) {
      return res.status(400).json({ error: "주주가 없습니다" });
    }

    const totalShares = shareholders.reduce((s: number, r: any) => s + r.quantity, 0);
    const perShare = totalAmount / totalShares;

    // 주주별 배당금 지급
    const results = [];
    for (const holder of shareholders) {
      const reward = Math.floor(totalAmount * holder.ratio * 100) / 100;
      if (reward <= 0) continue;
      try {
        await transferCoin({
          fromUserId: `company:${companyId}`,
          toUserId: holder.user_id,
          assetTypeId: company.asset_type_id,
          amount: reward,
          description: `배당금 (${company.name})`,
          requestId: `dividend-${companyId}-${holder.user_id}-${Date.now()}`,
        });
        results.push({ userId: holder.user_id, amount: reward, success: true });
      } catch (e: any) {
        results.push({ userId: holder.user_id, amount: reward, success: false, error: e.message });
      }
    }

    // 배당 내역 기록
    await sql`
      INSERT INTO investment.dividends (company_id, total_amount, per_share, executed_by, memo)
      VALUES (${companyId}, ${totalAmount}, ${perShare}, ${user.userId}::uuid, ${memo || ""})
    `;

    const successCount = results.filter((r) => r.success).length;
    res.json({
      success: true,
      perShare,
      totalShareholders: shareholders.length,
      successCount,
      results,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 배당 내역 조회
// GET /dividend/:companyId
router.get("/dividend/:companyId", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const dividends = await sql`
      SELECT d.*, u.username as executed_by_name
      FROM investment.dividends d
      LEFT JOIN public.users u ON d.executed_by = u.id
      WHERE d.company_id = ${companyId}
      ORDER BY d.executed_at DESC
    `;
    res.json(dividends);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
