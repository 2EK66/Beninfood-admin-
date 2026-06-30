import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BfOrder, BfPayoutRequest, BfRestaurant, BfProfile } from "../../types";
import {
  TrendingUp, Store, Bike, ShoppingBag,
  Coins, Clock, CheckCircle, AlertCircle, Users
} from "lucide-react";

interface DashStats {
  totalRevenue: number;
  commissionRevenue: number;
  restaurantCount: number;
  livreurCount: number;
  clientCount: number;
  orderCount: number;
  ordersPending: number;
  ordersDelivered: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;
}

function StatCard({ icon, label, value, sub, color, trend }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: string; trend?: "up" | "neutral";
}) {
  return (
    <div className={`bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend === "up" && (
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            ▲ Live
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white leading-none">{value}</p>
        <p className="text-xs text-white/40 font-semibold mt-1">{label}</p>
        {sub && <p className="text-[10px] text-[#fcd116]/70 font-bold mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashStats>({
    totalRevenue: 0, commissionRevenue: 0,
    restaurantCount: 0, livreurCount: 0, clientCount: 0,
    orderCount: 0, ordersPending: 0, ordersDelivered: 0,
    pendingPayouts: 0, pendingPayoutsAmount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<BfOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const [restaurantsRes, profilesRes, ordersRes, payoutsRes] = await Promise.all([
      supabase.from("bf_restaurants").select("id", { count: "exact" }),
      supabase.from("bf_profiles").select("id, role", { count: "exact" }),
      supabase.from("bf_orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("bf_payout_requests").select("*").eq("status", "en_cours"),
    ]);

    const orders: BfOrder[] = ordersRes.data || [];
    const profiles: Pick<BfProfile, "id" | "role">[] = profilesRes.data || [];
    const payouts: BfPayoutRequest[] = payoutsRes.data || [];

    const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const commission = orders.reduce((s, o) => s + (o.commission_amount || 0), 0);

    setStats({
      totalRevenue,
      commissionRevenue: commission,
      restaurantCount: restaurantsRes.count || 0,
      livreurCount: profiles.filter(p => p.role === "Livreur").length,
      clientCount: profiles.filter(p => p.role === "Client").length,
      orderCount: orders.length,
      ordersPending: orders.filter(o => o.status === "pending").length,
      ordersDelivered: orders.filter(o => o.status === "delivered").length,
      pendingPayouts: payouts.length,
      pendingPayoutsAmount: payouts.reduce((s, p) => s + p.amount, 0),
    });

    setRecentOrders(orders.slice(0, 8));
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    // Realtime refresh
    const channel = supabase.channel("dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bf_orders" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "bf_payout_requests" }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending:   { label: "En attente",  color: "text-amber-400 bg-amber-500/10" },
    accepted:  { label: "Acceptée",    color: "text-blue-400 bg-blue-500/10" },
    scanned:   { label: "En route",    color: "text-purple-400 bg-purple-500/10" },
    arrived:   { label: "Arrivé",      color: "text-indigo-400 bg-indigo-500/10" },
    delivered: { label: "Livrée ✓",    color: "text-emerald-400 bg-emerald-500/10" },
    cancelled: { label: "Annulée",     color: "text-red-400 bg-red-500/10" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#fcd116] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Tableau de bord</h1>
        <p className="text-sm text-white/40 mt-1">Vue d'ensemble de l'écosystème BéninFood en temps réel</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp size={18} className="text-[#fcd116]" />}
          label="Chiffre d'affaires"
          value={`${stats.totalRevenue.toLocaleString("fr-FR")} F`}
          sub={`Commission : ${stats.commissionRevenue.toLocaleString()} F`}
          color="bg-[#fcd116]/10"
          trend="up"
        />
        <StatCard
          icon={<ShoppingBag size={18} className="text-emerald-400" />}
          label="Commandes total"
          value={String(stats.orderCount)}
          sub={`${stats.ordersDelivered} livrées • ${stats.ordersPending} en attente`}
          color="bg-emerald-500/10"
          trend="up"
        />
        <StatCard
          icon={<Store size={18} className="text-blue-400" />}
          label="Restaurants actifs"
          value={String(stats.restaurantCount)}
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<Users size={18} className="text-purple-400" />}
          label="Utilisateurs"
          value={String(stats.clientCount + stats.livreurCount)}
          sub={`${stats.clientCount} clients • ${stats.livreurCount} livreurs`}
          color="bg-purple-500/10"
        />
      </div>

      {/* Alerte reversements */}
      {stats.pendingPayouts > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <AlertCircle size={20} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-300">
              {stats.pendingPayouts} demande{stats.pendingPayouts > 1 ? "s" : ""} de reversement en attente
            </p>
            <p className="text-xs text-amber-400/70">
              Montant total : {stats.pendingPayoutsAmount.toLocaleString("fr-FR")} FCFA — Allez dans Finances pour valider
            </p>
          </div>
        </div>
      )}

      {/* Commandes récentes */}
      <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2e1f] flex items-center justify-between">
          <h2 className="text-sm font-black text-white">Commandes récentes</h2>
          <span className="text-[10px] text-white/30 font-mono">table : bf_orders</span>
        </div>
        <div className="divide-y divide-[#1a2e1f]">
          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
              Aucune commande pour l'instant
            </div>
          ) : recentOrders.map(order => {
            const s = statusLabel[order.status] || { label: order.status, color: "text-white/40 bg-white/5" };
            return (
              <div key={order.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white font-mono truncate">{order.id.slice(0, 8)}…</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {new Date(order.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#fcd116]">{order.total_amount.toLocaleString()} F</p>
                  <p className="text-[10px] text-white/30">com. {order.commission_amount.toLocaleString()} F</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.color}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
