import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BfPayoutRequest, BfOrder } from "../../types";
import { Coins, CheckCircle, XCircle, RefreshCw, TrendingUp, Clock } from "lucide-react";

interface EnrichedPayout extends BfPayoutRequest {
  restaurantName?: string;
}

export default function Finances() {
  const [payouts, setPayouts] = useState<EnrichedPayout[]>([]);
  const [orders, setOrders] = useState<BfOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [payoutsRes, ordersRes, restaurantsRes] = await Promise.all([
      supabase.from("bf_payout_requests").select("*").order("requested_at", { ascending: false }),
      supabase.from("bf_orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("bf_restaurants").select("id, owner_id, name"),
    ]);

    const restaurants = restaurantsRes.data || [];
    const enriched: EnrichedPayout[] = (payoutsRes.data || []).map(p => ({
      ...p,
      restaurantName: restaurants.find(r => r.owner_id === p.user_id)?.name || "Gérant inconnu",
    }));

    setPayouts(enriched);
    setOrders(ordersRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("finances_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "bf_payout_requests" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleValidate = async (payout: EnrichedPayout) => {
    if (!confirm(`Valider le transfert de ${payout.amount.toLocaleString()} FCFA vers ${payout.momo_number} ?`)) return;
    setProcessing(payout.id);
    const { error } = await supabase
      .from("bf_payout_requests")
      .update({ status: "valide", processed_at: new Date().toISOString() })
      .eq("id", payout.id);
    setProcessing(null);
    if (error) return showToast("err", error.message);
    showToast("ok", `Transfert de ${payout.amount.toLocaleString()} FCFA validé via KKiaPay !`);
    await fetchAll();
  };

  const handleReject = async (payout: EnrichedPayout) => {
    if (!confirm(`Rejeter la demande de ${payout.restaurantName} ?`)) return;
    setProcessing(payout.id);
    const { error } = await supabase
      .from("bf_payout_requests")
      .update({ status: "rejete", processed_at: new Date().toISOString() })
      .eq("id", payout.id);
    setProcessing(null);
    if (error) return showToast("err", error.message);
    showToast("ok", "Demande rejetée.");
    await fetchAll();
  };

  // KPIs financiers
  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalCommission = orders.reduce((s, o) => s + (o.commission_amount || 0), 0);
  const totalDelivery = orders.reduce((s, o) => s + (o.delivery_amount || 0), 0);
  const totalRestaurant = orders.reduce((s, o) => s + (o.restaurant_amount || 0), 0);
  const pendingPayouts = payouts.filter(p => p.status === "en_cours");
  const pendingAmount = pendingPayouts.reduce((s, p) => s + p.amount, 0);

  const statusStyle: Record<string, string> = {
    en_cours: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    valide:   "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    rejete:   "text-red-300 bg-red-500/10 border-red-500/20",
  };
  const statusLabel: Record<string, string> = {
    en_cours: "En attente", valide: "Validé ✓", rejete: "Rejeté",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Finances</h1>
          <p className="text-sm text-white/40 mt-1">Reversements Mobile Money & répartition des revenus</p>
        </div>
        <button onClick={fetchAll} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition cursor-pointer">
          <RefreshCw size={16} />
        </button>
      </div>

      {toast && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
          toast.type === "ok"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-red-500/10 border-red-500/20 text-red-300"
        }`}>{toast.msg}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "C.A. total", value: `${totalRevenue.toLocaleString("fr-FR")} F`, color: "text-[#fcd116]" },
          { label: "Commission BéninFood (10%)", value: `${totalCommission.toLocaleString()} F`, color: "text-emerald-400" },
          { label: "Reversements restaurants (75%)", value: `${totalRestaurant.toLocaleString()} F`, color: "text-blue-400" },
          { label: "Frais livreurs (15%)", value: `${totalDelivery.toLocaleString()} F`, color: "text-purple-400" },
        ].map(k => (
          <div key={k.label} className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-4">
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-white/30 font-semibold mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Demandes en attente */}
      {pendingPayouts.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-500/10 flex items-center gap-2">
            <Clock size={15} className="text-amber-400" />
            <h2 className="text-sm font-black text-amber-300">
              {pendingPayouts.length} reversement{pendingPayouts.length > 1 ? "s" : ""} en attente — {pendingAmount.toLocaleString()} FCFA
            </h2>
          </div>
          <div className="divide-y divide-amber-500/10">
            {pendingPayouts.map(p => (
              <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{p.restaurantName}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    +229 {p.momo_number} • {p.momo_number.startsWith("6") ? "MTN MoMo" : "Moov Flooz"} •{" "}
                    {new Date(p.requested_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p className="text-base font-black text-[#fcd116] flex-shrink-0">
                  {p.amount.toLocaleString()} FCFA
                </p>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleValidate(p)}
                    disabled={processing === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle size={13} />
                    {processing === p.id ? "…" : "Valider"}
                  </button>
                  <button
                    onClick={() => handleReject(p)}
                    disabled={processing === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-black rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle size={13} />
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique complet */}
      <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2e1f]">
          <h2 className="text-sm font-black text-white">Historique des reversements</h2>
          <p className="text-xs text-white/30 font-mono mt-0.5">table : bf_payout_requests</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#fcd116] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Coins size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune demande de reversement</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2e1f]">
            {payouts.map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{p.restaurantName}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {p.momo_number} • {new Date(p.requested_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <p className="text-sm font-black text-white flex-shrink-0">{p.amount.toLocaleString()} F</p>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${statusStyle[p.status]}`}>
                  {statusLabel[p.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
