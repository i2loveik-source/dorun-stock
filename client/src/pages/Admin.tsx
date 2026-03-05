import { useEffect, useState } from "react";
import { api, formatNum, getUser } from "../api";

type AdminTab = "ipo" | "market" | "settings" | "notice";

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>("ipo");
  const [pending, setPending] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const user = getUser();

  const allowedRoles = ["관리자", "org_issuer", "platform_admin"];
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F6FA]">
        <div className="text-center p-8">
          <p className="text-5xl mb-3">🔒</p>
          <p className="text-lg font-black text-gray-700">관리자 전용 페이지</p>
          <p className="text-sm mt-2 text-gray-400">관리자 계정으로 로그인 후 이용해주세요.</p>
        </div>
      </div>
    );
  }

  const loadPending = async () => {
    const data = await api("/api/companies/pending");
    if (Array.isArray(data)) setPending(data);
  };

  const loadCompanies = async () => {
    const data = await api("/api/companies");
    if (Array.isArray(data)) setCompanies(data.filter((c: any) => c.status !== "pending"));
  };

  useEffect(() => {
    loadPending();
    loadCompanies();
  }, []);

  const showMsg = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 4000);
  };

  const approve = async (id: number) => {
    setLoading(true);
    const r = await api(`/api/companies/${id}/approve`, { method: "POST" });
    setLoading(false);
    showMsg(r.error ? "❌ " + r.error : "✅ IPO 승인 완료!");
    loadPending();
    loadCompanies();
  };

  const reject = async (id: number) => {
    const reason = prompt("거절 사유를 입력하세요:");
    if (!reason) return;
    setLoading(true);
    await api(`/api/companies/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
    setLoading(false);
    showMsg("거절 처리 완료");
    loadPending();
  };

  const updateStatus = async (id: number, status: string) => {
    const actionMap: Record<string, string> = {
      suspended: "거래정지",
      listed: "거래재개",
      delisted: "상장폐지",
    };
    const label = actionMap[status] || status;
    if (!confirm(`${label} 처리하시겠습니까?`)) return;
    let url = "";
    if (status === "delisted") {
      url = `/api/companies/${id}/delist`;
    } else {
      // suspend/resume via status endpoint (if exists, else show msg)
      url = `/api/companies/${id}/status`;
    }
    setLoading(true);
    const r = await api(url, { method: "POST", body: JSON.stringify({ status }) });
    setLoading(false);
    if (r.error) showMsg("❌ " + r.error);
    else { showMsg(`✅ ${label} 처리 완료!`); loadCompanies(); }
  };

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "ipo", label: `📋 IPO 승인${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { key: "market", label: "📊 시장 관리" },
    { key: "settings", label: "⚙️ 거래 설정" },
    { key: "notice", label: "📢 공지 관리" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-24">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h2 className="font-black text-xl text-gray-800">⚙️ 관리자 패널</h2>
        <p className="text-xs text-gray-400 mt-0.5">IPO 승인 · 시장 관리 · 설정</p>
      </div>

      {/* 알림 메시지 */}
      {msg && (
        <div className={`mx-4 mt-3 p-3 rounded-xl text-sm font-medium
          ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {msg}
        </div>
      )}

      {/* 탭 바 */}
      <div className="mx-4 mt-3 bg-white rounded-2xl p-1 shadow-sm flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap
              ${tab === t.key ? "bg-indigo-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* IPO 승인 탭 */}
      {tab === "ipo" && (
        <div className="px-4 mt-3 space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-sm font-medium">대기 중인 IPO 신청이 없습니다</p>
            </div>
          ) : pending.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{c.logo_emoji || "🏢"}</span>
                <div className="flex-1">
                  <p className="font-black text-base text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    CEO: {c.ceo_name || c.ceo_username}
                    {c.org_name ? ` · ${c.org_name}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">IPO가</p>
                  <p className="font-black text-indigo-600 text-sm">{formatNum(c.ipo_price)} {c.coin_symbol}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 mb-3 bg-gray-50 rounded-xl px-3 py-2">
                <span>총주식: <b className="text-gray-700">{formatNum(c.total_shares)}주</b></span>
                <span>시총: <b className="text-gray-700">{formatNum(c.ipo_price * c.total_shares)} {c.coin_symbol}</b></span>
              </div>
              {c.description && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-2 mb-2">{c.description}</p>
              )}
              {c.business_plan && (
                <p className="text-xs text-gray-500 bg-blue-50 rounded-xl p-2 mb-3">{c.business_plan}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => approve(c.id)}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  ✅ 승인
                </button>
                <button
                  onClick={() => reject(c.id)}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-red-100 text-red-600 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  ❌ 거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 시장 관리 탭 */}
      {tab === "market" && (
        <div className="px-4 mt-3 space-y-3">
          {companies.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
              <p className="text-4xl mb-2">📊</p>
              <p className="text-sm font-medium">상장된 회사가 없습니다</p>
            </div>
          ) : companies.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{c.logo_emoji || "🏢"}</span>
                <div className="flex-1">
                  <p className="font-black text-sm text-gray-800">{c.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${c.status === "listed" ? "bg-green-100 text-green-700"
                    : c.status === "suspended" ? "bg-orange-100 text-orange-600"
                    : "bg-red-100 text-red-600"}`}>
                    {c.status === "listed" ? "상장중" : c.status === "suspended" ? "거래정지" : "상장폐지"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-black text-indigo-600 text-sm">{formatNum(c.current_price || c.ipo_price)}</p>
                  <p className="text-xs text-gray-400">{c.coin_symbol}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {c.status !== "suspended" && c.status !== "delisted" && (
                  <button
                    onClick={() => updateStatus(c.id, "suspended")}
                    disabled={loading}
                    className="flex-1 py-2 bg-orange-100 text-orange-600 rounded-xl font-bold text-xs disabled:opacity-50"
                  >
                    ⏸ 거래정지
                  </button>
                )}
                {c.status === "suspended" && (
                  <button
                    onClick={() => updateStatus(c.id, "listed")}
                    disabled={loading}
                    className="flex-1 py-2 bg-green-100 text-green-700 rounded-xl font-bold text-xs disabled:opacity-50"
                  >
                    ▶ 거래재개
                  </button>
                )}
                {c.status !== "delisted" && (
                  <button
                    onClick={() => updateStatus(c.id, "delisted")}
                    disabled={loading}
                    className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl font-bold text-xs disabled:opacity-50"
                  >
                    🚫 상장폐지
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 거래 설정 탭 (더미) */}
      {tab === "settings" && (
        <div className="px-4 mt-3 space-y-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-black text-sm text-gray-700 mb-3">⚙️ 거래 수수료 설정</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">거래 수수료율</span>
                <span className="text-sm font-bold text-gray-800">0.3%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">서킷브레이커 상한</span>
                <span className="text-sm font-bold text-gray-800">+30%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">서킷브레이커 하한</span>
                <span className="text-sm font-bold text-gray-800">-30%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-xl p-2">
              💡 거래 설정 변경 기능은 추후 업데이트 예정입니다.
            </p>
          </div>
        </div>
      )}

      {/* 공지 관리 탭 (더미) */}
      {tab === "notice" && (
        <div className="px-4 mt-3 space-y-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-black text-sm text-gray-700 mb-2">📢 공지 관리</p>
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
              💡 공지 관리 기능은 추후 업데이트 예정입니다.<br />
              현재는 공시(뉴스) 기능을 통해 공지사항을 전달하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
