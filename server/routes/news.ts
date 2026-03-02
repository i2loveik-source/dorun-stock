import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { sql } from "../db.js";
import { getIo } from "../socket.js";

const router = Router();

// 공시 목록
// GET /news?orgId=
router.get("/news", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = parseInt(req.query.orgId as string) || user.organizationId;
    const announcements = await sql`
      SELECT a.*,
             c.name as company_name,
             u.username as author_name, u.full_name as author_fullname
      FROM investment.announcements a
      LEFT JOIN investment.companies c ON a.company_id = c.id
      LEFT JOIN public.users u ON a.author_id = u.id
      WHERE a.organization_id = ${orgId}
      ORDER BY a.created_at DESC LIMIT 30
    `;
    res.json(announcements);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 공시 발행 (관리자)
// POST /news
router.post("/news", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!["관리자", "org_issuer", "platform_admin"].includes(user.role)) {
      return res.status(403).json({ error: "관리자만 공시를 발행할 수 있습니다" });
    }
    const { title, content, companyId, impact } = req.body;
    if (!title) return res.status(400).json({ error: "제목 필수" });

    const news = await sql`
      INSERT INTO investment.announcements
        (organization_id, company_id, author_id, title, content, impact)
      VALUES
        (${user.organizationId}, ${companyId || null}, ${user.userId}::uuid,
         ${title}, ${content || ""}, ${impact || "neutral"})
      RETURNING *
    `;

    // 실시간 알림
    try {
      const hint = impact === "positive" ? "📈 호재 발표!"
        : impact === "negative" ? "📉 악재 발표!"
        : "📢 공시";
      getIo().to(`org_${user.organizationId}`).emit("news_published", {
        news: news[0],
        hint,
      });
    } catch {}

    res.json(news[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
