import { useEffect, useState } from "react";
import { api, formatNum, changeBg, changeArrow } from "../api";

export default function Portfolio() {
  const [data, setData] = useState<{ holdings: any[]; totalValue: number; totalPnL: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/portfolio").then(d => {
      if (!d.error) setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-gray-400"><p className="text-4xl mb-2">⏳</p><p>불러오는 중...</p></div>
    </div>
  );

  const pnlColor = (data?.totalPnL || 0) >= 0 ? "text-red-500" : "text-blue-500";

  return (
    <div className="pb-24">
      <div className="bg-white border-b px-4 py-3">
        <h2 className="font-black text-xl text-gray-800">💼 내 포트폴리오</h2>
      </div>

      {/* 총 평가액 */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white">
        <p className="text-sm opacity-80">총 평가액</p>
        <p className="font-black text-3xl mt-1">{formatNum(data?.totalValue || 0)}</p>
        <p className={`text-sm mt-2 font-bold ${(data?.totalPnL || 0) >= 0 ? "text-red-200" : "text-blue-200"}`}>
          {(data?.totalPnL || 0) >= 0 ? "▲ +" : "▼ "}{formatNum(Math.abs(data?.totalPnL || 0))} 수익
        </p>
      </div>

      {/* 종목 목록 */}
      <div className="px-4 mt-4 space-y-2">
        {!data?.holdings.length ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">보유 주식이 없습니다</p>
            <p className="text-xs text-gray-300 mt-1">시장에서 주식을 매수해보세요</p>
          </div>
        ) : data.holdings.map(h => {
          const rate = parseFloat(h.change_rate || 0);
          const pnlRate = parseFloat(h.profit_rate || 0);
          return (
            <div key={h.company_id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{h.logo_emoji || "🏢"}</span>
                  <div>
                    <p className="font-black text-sm text-gray-800">{h.company_name}</p>
                    <p className="text-xs text-gray-400">{formatNum(h.quantity)}주 보유</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-base text-gray-800">
                    {formatNum(h.current_value)} <span className="text-xs font-normal text-gray-400">{h.coin_symbol}</span>
                  </p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border mt-0.5 inline-block ${changeBg(rate)}`}>
                    {changeArrow(rate)} {Math.abs(rate).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
                {[
                  ["현재가", `${formatNum(h.current_price)}`],
                  ["평균매수가", `${formatNum(h.avg_buy_price || 0)}`],
                  ["수익률", `${pnlRate >= 0 ? "+" : ""}${parseFloat(h.profit_rate || 0).toFixed(2)}%`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] text-gray-400">{k}</p>
                    <p className={`text-xs font-bold ${k === "수익률" ? (pnlRate >= 0 ? "text-red-500" : "text-blue-500") : "text-gray-700"}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
