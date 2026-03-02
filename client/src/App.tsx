import { useState, useEffect } from "react";
import { api, getToken, setToken, setUser, clearToken, getUser } from "./api";
import Market from "./pages/Market";
import Company from "./pages/Company";
import Portfolio from "./pages/Portfolio";
import News from "./pages/News";
import Admin from "./pages/Admin";

type Page = "market" | "portfolio" | "news" | "admin";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [page, setPage] = useState<Page>("market");
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();
  const isAdmin = ["관리자", "org_issuer", "platform_admin"].includes(user?.role || "");

  // SSO 자동 로그인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("sso_token");

    if (ssoToken) {
      api(`/api/auth/sso?sso_token=${ssoToken}`).then(data => {
        if (data.token) {
          setToken(data.token);
          setUser(data.user);
          setLoggedIn(true);
          // URL 정리
          window.history.replaceState({}, "", window.location.pathname);
        }
        setLoading(false);
      });
    } else if (getToken()) {
      // 기존 토큰 검증
      api("/api/auth/me").then(data => {
        if (data.error) {
          clearToken();
          setLoggedIn(false);
        } else {
          setUser(data);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center text-gray-400">
        <p className="text-5xl mb-3">📈</p>
        <p className="text-lg font-bold text-gray-600">두런 스탁</p>
        <p className="text-sm mt-1">불러오는 중...</p>
      </div>
    </div>
  );

  if (!loggedIn) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-center px-8">
        <p className="text-7xl mb-4">📈</p>
        <h1 className="text-3xl font-black text-gray-800 mb-2">두런 스탁</h1>
        <p className="text-gray-500 mb-8">학생 창업 투자 플랫폼</p>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-left space-y-3">
          <p className="font-bold text-gray-700 text-sm">🔐 두런 허브 계정으로 로그인</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            두런 허브(dorunhub.com)에서 로그인 후<br />
            상단 메뉴의 <strong>💹 두런 스탁</strong>을 클릭하면<br />
            자동으로 연결됩니다.
          </p>
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-xs text-indigo-600 font-mono break-all">
              stock.dorunhub.com?sso_token=...
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-300 mt-4">개발 환경에서는 두런 코인 토큰을 사용하세요</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      {/* 선택된 회사 상세 */}
      {selectedCompany ? (
        <Company companyId={selectedCompany} onBack={() => setSelectedCompany(null)} />
      ) : (
        <>
          {page === "market" && <Market onSelect={setSelectedCompany} />}
          {page === "portfolio" && <Portfolio />}
          {page === "news" && <News />}
          {page === "admin" && <Admin />}
        </>
      )}

      {/* 하단 탭 바 */}
      {!selectedCompany && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 max-w-lg mx-auto">
          <div className="flex">
            {[
              { key: "market", icon: "📈", label: "시장" },
              { key: "portfolio", icon: "💼", label: "포트폴리오" },
              { key: "news", icon: "📰", label: "공시" },
              ...(isAdmin ? [{ key: "admin", icon: "⚙️", label: "관리" }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setPage(tab.key as Page)}
                className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition
                  ${page === tab.key ? "text-indigo-600" : "text-gray-400"}`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] font-bold">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
