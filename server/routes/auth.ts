import { Router, Request, Response } from "express";
import { requireAuth, verifySsoToken, generateStockToken } from "../auth.js";
import { sql } from "../db.js";

const router = Router();

// SSO 로그인 (두런 코인/허브 토큰으로 자동 로그인)
// GET /auth/sso?sso_token=...
router.get("/auth/sso", async (req: Request, res: Response) => {
  try {
    const { sso_token } = req.query as any;
    if (!sso_token) return res.status(400).json({ error: "sso_token 필요" });

    const user = verifySsoToken(sso_token);
    if (!user) return res.status(401).json({ error: "유효하지 않은 토큰" });

    // 두런 허브 유저 정보 조회
    const users = await sql`
      SELECT u.id, u.username, u.full_name, u.school_id,
             s.name as org_name,
             uo.role as org_role, uo.organization_id
      FROM public.users u
      LEFT JOIN public.schools s ON u.school_id = s.id
      LEFT JOIN public.user_organizations uo
        ON uo.user_id::text = u.id::text
        AND uo.organization_id = u.school_id
        AND uo."isApproved" = true
      WHERE u.id::text = ${user.userId}
      LIMIT 1
    `;
    if (users.length === 0) return res.status(404).json({ error: "허브 계정 없음" });

    const u = users[0];
    const stockToken = generateStockToken({
      userId: u.id,
      role: u.org_role || "member",
      organizationId: u.organization_id || u.school_id,
      username: u.username,
    });

    // URL 토큰 제거 후 응답
    res.json({
      token: stockToken,
      user: {
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        orgName: u.org_name,
        orgId: u.organization_id || u.school_id,
        role: u.org_role,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 현재 로그인 유저 정보
// GET /auth/me
router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const users = await sql`
      SELECT u.id, u.username, u.full_name, u.school_id,
             s.name as org_name,
             uo.role as org_role, uo.organization_id
      FROM public.users u
      LEFT JOIN public.schools s ON u.school_id = s.id
      LEFT JOIN public.user_organizations uo
        ON uo.user_id::text = u.id::text
        AND uo."isApproved" = true
      WHERE u.id::text = ${user.userId}
      LIMIT 1
    `;
    if (users.length === 0) return res.status(404).json({ error: "유저 없음" });
    res.json(users[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
