import { useEffect, useState } from "react";
import { api, formatNum, changeBg, changeArrow, getUser } from "../api";

export default function Market({ onSelect }: { onSelect: (id: number) => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const user = getUser();

  const load = async () => {
    setLoading(true);
    const data = await api(`/api/companies?orgId=${user?.orgId || ""}`);
    setCompanies(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  // 30초마다 자동 갱신
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = companies.filter(c =>
    c.name.includes(search) || c.ceo_name?.includes(search)
  );

  return (
    <div className="pb-24">
      {/* 헤더 */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="font-black text-xl text-gray-800">📈 두런 스탁</h1>
        <p className="text-xs text-gray-400">{user?.orgName} 주식 시장</p>
      </div>

      {/* 검색 */}
      <div className="px-4 pt-3 pb-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 회사명 또는 CEO 검색"
          className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm bg-white outline-none focus:border-indigo-400"
        />
      </div>

      {/* 요약 통계 */}
      <div className="px-4 mb-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "상장 종목", value: companies.filter(c => c.status === "listed").length + "개" },
            { label: "거래 정지", value: companies.filter(c => c.status === "suspended").length + "개" },
            { label: "전체 종목", value: companies.length + "개" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 text-center border border-gray-100">
              <p className="font-black text-lg text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 종목 목록 */}
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">⏳</p>
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🏢</p>
            <p className="text-sm">상장된 회사가 없습니다</p>
          </div>
        ) : filtered.map(c => {
          const rate = parseFloat(c.change_rate || 0);
          const isSuspended = c.status === "suspended";
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full bg-white rounded-2xl p-4 border text-left transition active:scale-98 shadow-sm
                ${isSuspended ? "border-orange-200 opacity-70" : "border-gray-100 hover:border-indigo-200"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{c.logo_emoji || "🏢"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-base text-gray-800">{c.name}</p>
                      {isSuspended && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">
                          ⚠️ 거래정지
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      CEO {c.ceo_name || c.ceo_username} · {c.coin_symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-base text-gray-800">
                    {formatNum(c.current_price || c.ipo_price)} <span className="text-xs font-normal text-gray-400">{c.coin_symbol}</span>
                  </p>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mt-0.5 ${changeBg(rate)}`}>
                    {changeArrow(rate)} {Math.abs(rate).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* 하단 정보 */}
              <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-gray-50 text-xs text-gray-400">
                <span>시총 {formatNum(c.market_cap || 0)}</span>
                <span>·</span>
                <span>주주 {c.shareholder_count || 0}명</span>
                <span>·</span>
                <span>IPO {formatNum(c.ipo_price)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
