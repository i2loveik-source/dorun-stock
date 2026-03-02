/**
 * 두런 코인 내부 API 호출 서비스
 */
const COIN_API = process.env.COIN_API_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_SECRET!;

const headers = {
  "Content-Type": "application/json",
  "x-internal-key": INTERNAL_KEY,
};

// 유저 검증
export async function validateUser(userId: string) {
  const res = await fetch(`${COIN_API}/api/internal/validate/${userId}`, { headers });
  if (!res.ok) throw new Error("유저 없음");
  return res.json();
}

// 회사 지갑 생성
export async function createCompanyWallet(companyId: number, assetTypeId: number) {
  const res = await fetch(`${COIN_API}/api/internal/wallet/create`, {
    method: "POST", headers,
    body: JSON.stringify({ companyId, assetTypeId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "지갑 생성 실패");
  return data;
}

// 지갑 잔액 조회
export async function getWalletBalance(userId: string, assetTypeId: number) {
  const res = await fetch(`${COIN_API}/api/internal/wallet/${encodeURIComponent(userId)}/${assetTypeId}`, { headers });
  if (!res.ok) return { balance: 0 };
  return res.json();
}

// 코인 이전 (핵심)
export async function transferCoin(params: {
  fromUserId?: string | null;
  toUserId: string;
  assetTypeId: number;
  amount: number;
  description: string;
  requestId?: string;
}) {
  const res = await fetch(`${COIN_API}/api/internal/transfer`, {
    method: "POST", headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "코인 이전 실패");
  return data;
}

// 조직 코인 목록
export async function getOrgCoins(orgId: number) {
  const res = await fetch(`${COIN_API}/api/internal/org-coins/${orgId}`, { headers });
  if (!res.ok) throw new Error("코인 목록 조회 실패");
  return res.json();
}
