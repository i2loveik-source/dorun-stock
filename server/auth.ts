import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dorun-coin-dev-secret";

export interface StockUser {
  userId: string;
  role: string;
  organizationId?: number;
  username?: string;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .map(v => v.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const i = part.indexOf("=");
      if (i < 0) return acc;
      const key = part.slice(0, i).trim();
      const val = decodeURIComponent(part.slice(i + 1).trim());
      acc[key] = val;
      return acc;
    }, {});
}

function toUser(decoded: any): StockUser {
  return {
    userId: decoded.userId,
    role: decoded.role,
    organizationId: decoded.organizationId,
    username: decoded.username,
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies.stock_token || cookies.coin_token || cookies.token;
  if (cookieToken) return cookieToken;

  const q = req.query as any;
  return q?.token || q?.sso_token || null;
}

// JWT 검증 미들웨어 (두런 코인과 시크릿 공유)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "로그인 필요" });

  try {
    // 1) stock 전용 토큰
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = toUser(decoded);
    return next();
  } catch {
    // 2) hub/coin sso 토큰 fallback
    const ssoUser = verifySsoToken(token);
    if (ssoUser) {
      (req as any).user = ssoUser;
      return next();
    }
    return res.status(401).json({ error: "토큰 만료 또는 유효하지 않음" });
  }
}

// SSO 토큰 검증 (coin_token → stock session)
export function verifySsoToken(token: string): StockUser | null {
  const secrets = [
    process.env.HUB_SSO_SECRET,
    "hub-sso-shared-secret",
    JWT_SECRET,
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      const decoded = jwt.verify(token, secret) as any;
      return {
        userId: decoded.userId,
        role: decoded.role,
        organizationId: decoded.organizationId,
        username: decoded.username,
      };
    } catch {
      // try next secret
    }
  }
  return null;
}

// stock 전용 JWT 발급
export function generateStockToken(user: StockUser): string {
  return jwt.sign({ ...user, type: "access" }, JWT_SECRET, { expiresIn: "7d" });
}
