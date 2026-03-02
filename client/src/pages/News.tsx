import { useEffect, useState } from "react";
import { api, getUser } from "../api";

export default function News() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    api(`/api/news?orgId=${user?.orgId || ""}`).then(d => {
      if (Array.isArray(d)) setNews(d);
      setLoading(false);
    });
  }, []);

  const impactStyle = (impact: string) =>
    impact === "positive" ? "bg-red-50 border-red-200 text-red-700"
    : impact === "negative" ? "bg-blue-50 border-blue-200 text-blue-700"
    : "bg-gray-50 border-gray-200 text-gray-600";

  const impactLabel = (impact: string) =>
    impact === "positive" ? "📈 호재"
    : impact === "negative" ? "📉 악재"
    : "📢 공시";

  return (
    <div className="pb-24">
      <div className="bg-white border-b px-4 py-3">
        <h2 className="font-black text-xl text-gray-800">📰 공시 뉴스</h2>
        <p className="text-xs text-gray-400">기업 공시와 시장 뉴스</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">⏳</p><p>불러오는 중...</p></div>
        ) : news.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">📭</p><p className="text-sm">공시가 없습니다</p></div>
        ) : news.map(n => (
          <div key={n.id} className={`rounded-2xl p-4 border ${impactStyle(n.impact)}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold">{impactLabel(n.impact)}</span>
                  {n.company_name && (
                    <span className="text-xs bg-white bg-opacity-60 px-2 py-0.5 rounded-full">
                      {n.company_name}
                    </span>
                  )}
                </div>
                <p className="font-black text-sm">{n.title}</p>
                {n.content && <p className="text-xs mt-1 opacity-70 leading-relaxed">{n.content}</p>}
              </div>
            </div>
            <p className="text-[10px] opacity-50 mt-2">
              {n.author_fullname || n.author_name} · {new Date(n.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
