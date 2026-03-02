import { useEffect, useState, useCallback } from "react";
import { io as socketIo } from "socket.io-client";
import { api, formatNum, changeBg, changeArrow, getUser } from "../api";

interface Props {
  companyId: number;
  onBack: () => void;
}

export default function Company({ companyId, onBack }: Props) {
  const [company, setCompany] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<{ buy: any[]; sell: any[] }>({ buy: [], sell: [] });
  const [trades, setTrades] = useState<any[]>([]);
  const [myHolding, setMyHolding] = useState<any>({ quantity: 0 });
  const [tab, setTab] = useState<"orderbook" | "trades" | "info">("orderbook");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const user = getUser();

  const loadAll = useCallback(async () => {
    const [co, ob, tr, my] = await Promise.all([
      api(`/api/companies/${companyId}`),
      api(`/api/orders/${companyId}/orderbook`),
      api(`/api/trades/${companyId}`),
      api(`/api/portfolio/company/${companyId}`),
    ]);
    if (co && !co.error) setCompany(co);
    if (ob && !ob.error) setOrderbook(ob);
    if (Array.isArray(tr)) setTrades(tr);
    if (my && !my.error) setMyHolding(my);
  }, [companyId]);

  useEffect(() => {
    loadAll();
    // Socket.io 실시간 연결
    const socket = socketIo({ path: "/socket.io" });
    socket.emit("subscribe_company", companyId);
    socket.on("trade_executed", () => loadAll());
    socket.on("orderbook_updated", () => loadAll());
    socket.on("circuit_breaker", (data: any) => {
      setMsg(`⚠️ ${data.message}`);
      loadAll();
    });
    return () => { socket.disconnect(); };
  }, [companyId, loadAll]);

  const submitOrder = async () => {
    if (!price || !quantity) return setMsg("가격과 수량을 입력해주세요");
    setLoading(true);
    setMsg("");
    const res = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        companyId,
        orderType,
        price: parseFloat(price),
        quantity: parseInt(quantity),
      }),
    });
    setLoading(false);
    if (res.error) {
      setMsg("❌ " + res.error);
    } else {
      const filled = res.filled || 0;
      setMsg(filled > 0
        ? `✅ ${filled}주 체결 완료! (미체결 ${res.remaining}주 대기 중)`
        : "✅ 주문이 접수되었습니다 (대기 중)");
      setPrice(""); setQuantity("");
      loadAll();
    }
  };

  if (!company) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center text-gray-400">
        <p className="text-4xl mb-2">⏳</p><p>불러오는 중...</p>
      </div>
    </div>
  );

  const rate = parseFloat(company.change_rate || 0);
  const isSuspended = company.status === "suspended";

  return (
    <div className="pb-24">
      {/* 헤더 */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 text-xl">←</button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">{company.logo_emoji || "🏢"}</span>
            <div>
              <p className="font-black text-base text-gray-800">{company.name}</p>
              <p className="text-xs text-gray-400">CEO {company.ceo_name} · {company.coin_symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-lg text-gray-800">
              {formatNum(company.current_price || company.ipo_price)}
            </p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${changeBg(rate)}`}>
              {changeArrow(rate)} {Math.abs(rate).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* 서킷브레이커 경고 */}
      {isSuspended && (
        <div className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
          <p className="font-bold text-orange-700">⚠️ 거래 정지 중</p>
          <p className="text-xs text-orange-500 mt-0.5">{company.suspend_reason}</p>
        </div>
      )}

      {/* 내 보유 현황 */}
      {myHolding.quantity > 0 && (
        <div className="mx-4 mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-3">
          <p className="text-xs text-indigo-500 font-bold mb-1">📦 내 보유</p>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-indigo-700">{formatNum(myHolding.quantity)}주</span>
            <span className="text-indigo-500">
              평가액 {formatNum(myHolding.quantity * parseFloat(company.current_price || 0))} {company.coin_symbol}
            </span>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-2xl mx-4 mt-3 p-1 gap-1">
        {[
          ["orderbook", "📊 호가창"],
          ["trades", "📋 체결"],
          ["info", "ℹ️ 정보"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === k ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* 호가창 탭 */}
      {tab === "orderbook" && (
        <div className="px-4 mt-3">
          <div className="grid grid-cols-2 gap-2">
            {/* 매도 호가 */}
            <div>
              <p className="text-xs font-bold text-blue-600 mb-1 text-center">📉 매도</p>
              {[...orderbook.sell].reverse().map((o, i) => (
                <div key={i} className="flex justify-between items-center bg-blue-50 rounded-lg px-2 py-1 mb-0.5">
                  <span className="text-xs font-bold text-blue-700">{formatNum(o.price)}</span>
                  <span className="text-xs text-blue-400">{formatNum(o.total_qty)}주</span>
                </div>
              ))}
              {orderbook.sell.length === 0 && <p className="text-center text-xs text-gray-300 py-4">없음</p>}
            </div>
            {/* 매수 호가 */}
            <div>
              <p className="text-xs font-bold text-red-500 mb-1 text-center">📈 매수</p>
              {orderbook.buy.map((o, i) => (
                <div key={i} className="flex justify-between items-center bg-red-50 rounded-lg px-2 py-1 mb-0.5">
                  <span className="text-xs font-bold text-red-600">{formatNum(o.price)}</span>
                  <span className="text-xs text-red-400">{formatNum(o.total_qty)}주</span>
                </div>
              ))}
              {orderbook.buy.length === 0 && <p className="text-center text-xs text-gray-300 py-4">없음</p>}
            </div>
          </div>
        </div>
      )}

      {/* 체결 내역 탭 */}
      {tab === "trades" && (
        <div className="px-4 mt-3 space-y-1.5">
          {trades.length === 0 ? (
            <p className="text-center text-gray-300 py-8 text-sm">체결 내역 없음</p>
          ) : trades.map(t => (
            <div key={t.id} className="flex justify-between items-center bg-white rounded-xl px-3 py-2 border border-gray-100">
              <div>
                <span className="text-xs text-gray-400">
                  {new Date(t.executed_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <span className="font-bold text-sm text-gray-800">{formatNum(t.price)}</span>
              <span className="text-xs text-gray-500">{formatNum(t.quantity)}주</span>
            </div>
          ))}
        </div>
      )}

      {/* 정보 탭 */}
      {tab === "info" && (
        <div className="px-4 mt-3 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-2">📊 시장 정보</p>
            {[
              ["IPO 가격", `${formatNum(company.ipo_price)} ${company.coin_symbol}`],
              ["현재가", `${formatNum(company.current_price || company.ipo_price)} ${company.coin_symbol}`],
              ["고가", `${formatNum(company.high_price || company.ipo_price)}`],
              ["저가", `${formatNum(company.low_price || company.ipo_price)}`],
              ["거래량", `${formatNum(company.volume || 0)}주`],
              ["총 발행 주식", `${formatNum(company.total_shares)}주`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400">{k}</span>
                <span className="text-xs font-bold text-gray-700">{v}</span>
              </div>
            ))}
          </div>
          {company.description && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">📝 사업 소개</p>
              <p className="text-sm text-gray-600 leading-relaxed">{company.description}</p>
            </div>
          )}
          {company.business_plan && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">💡 사업 계획</p>
              <p className="text-sm text-gray-600 leading-relaxed">{company.business_plan}</p>
            </div>
          )}
        </div>
      )}

      {/* 주문 패널 (하단 고정) */}
      {!isSuspended && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t px-4 py-3 z-20">
          {msg && (
            <p className={`text-xs mb-2 font-medium ${msg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {msg}
            </p>
          )}
          <div className="flex gap-2 mb-2">
            <button onClick={() => setOrderType("BUY")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition
                ${orderType === "BUY" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"}`}>
              📈 매수
            </button>
            <button onClick={() => setOrderType("SELL")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition
                ${orderType === "SELL" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"}`}>
              📉 매도
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder={`가격 (현재 ${formatNum(company.current_price || company.ipo_price)})`}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
            />
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="수량 (주)"
              className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none text-center"
            />
            <button
              onClick={submitOrder}
              disabled={loading || !price || !quantity}
              className={`px-4 py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-40
                ${orderType === "BUY" ? "bg-red-500" : "bg-blue-500"}`}>
              {loading ? "⏳" : "주문"}
            </button>
          </div>
          {price && quantity && (
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              총 {formatNum(parseFloat(price) * parseInt(quantity) || 0)} {company.coin_symbol}
              <span className="ml-1 text-gray-300">(수수료 0.1% 별도)</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
