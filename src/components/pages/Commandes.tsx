import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BfOrder } from "../../types";
import { ShoppingBag, RefreshCw, Filter } from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:   { label: "En attente",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  accepted:  { label: "Acceptée",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  scanned:   { label: "En route",    color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  arrived:   { label: "Arrivé",      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  delivered: { label: "Livrée ✓",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  cancelled: { label: "Annulée",     color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export default function Commandes() {
  const [orders, setOrders] = useState<BfOrder[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bf_orders").select("*")
      .order("created_at", { ascending: false }).limit(100);
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const ch = supabase.channel("orders_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "bf_orders" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Commandes</h1>
          <p className="text-sm text-white/40 mt-1">{orders.length} commande{orders.length > 1 ? "s" : ""} au total</p>
        </div>
        <button onClick={fetch} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition cursor-pointer">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...Object.keys(STATUS_META)].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              filter === s
                ? "bg-[#fcd116] text-[#0d1a12] border-[#fcd116]"
                : "bg-white/5 text-white/50 border-white/10 hover:text-white"
            }`}>
            {s === "all" ? `Toutes (${orders.length})` : `${STATUS_META[s].label} (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1a2e1f]">
          <p className="text-xs text-white/30 font-mono">table : bf_orders • Realtime actif</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#fcd116] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <ShoppingBag size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune commande</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2e1f]">
            {filtered.map(o => {
              const s = STATUS_META[o.status] || { label: o.status, color: "text-white/40 bg-white/5 border-white/10" };
              return (
                <div key={o.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white font-mono">{o.id.slice(0, 12)}…</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {new Date(o.created_at).toLocaleString("fr-FR")}
                    </p>
                    {o.delivery_landmark && (
                      <p className="text-[10px] text-white/20 mt-0.5 truncate max-w-xs">📍 {o.delivery_landmark}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-[#fcd116]">{o.total_amount.toLocaleString()} F</p>
                    <p className="text-[9px] text-white/30">
                      resto {o.restaurant_amount.toLocaleString()} • livr. {o.delivery_amount.toLocaleString()} • com. {o.commission_amount.toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${s.color}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
