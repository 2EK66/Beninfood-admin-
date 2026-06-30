import { AdminTab } from "../../types";
import {
  LayoutDashboard, Store, Bike, ShoppingBag,
  Coins, ShieldCheck, LogOut, ShoppingCart
} from "lucide-react";

const NAV: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",   label: "Tableau de bord", icon: <LayoutDashboard size={18} /> },
  { id: "restaurants", label: "Restaurants",      icon: <Store size={18} /> },
  { id: "livreurs",    label: "Livreurs",          icon: <Bike size={18} /> },
  { id: "commandes",   label: "Commandes",         icon: <ShoppingBag size={18} /> },
  { id: "finances",    label: "Finances",           icon: <Coins size={18} /> },
  { id: "securite",    label: "Sécurité",           icon: <ShieldCheck size={18} /> },
];

interface Props {
  active: AdminTab;
  onNavigate: (tab: AdminTab) => void;
  onLogout: () => void;
  adminName: string;
  pendingPayouts: number;
}

export default function Sidebar({ active, onNavigate, onLogout, adminName, pendingPayouts }: Props) {
  return (
    <aside className="w-60 min-h-screen bg-[#0d1a12] border-r border-[#1a2e1f] flex flex-col fixed left-0 top-0 bottom-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1a2e1f]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#fcd116] rounded-xl flex items-center justify-center shadow-lg shadow-[#fcd116]/20">
            <ShoppingCart size={18} className="text-[#0d1a12]" />
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-tight leading-none">
              Bénin<span className="text-[#fcd116]">Food</span>
            </p>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
              Back-Office Admin
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const isActive = active === item.id;
          const badge = item.id === "finances" && pendingPayouts > 0 ? pendingPayouts : 0;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left relative cursor-pointer ${
                isActive
                  ? "bg-[#fcd116] text-[#0d1a12] shadow-md shadow-[#fcd116]/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Ribbon Bénin */}
      <div className="flex mx-3 mb-4 h-1 rounded-full overflow-hidden">
        <div className="bg-emerald-500 flex-1" />
        <div className="bg-[#fcd116] flex-1" />
        <div className="bg-red-500 flex-1" />
      </div>

      {/* Admin info + logout */}
      <div className="px-3 py-4 border-t border-[#1a2e1f]">
        <div className="flex items-center gap-2.5 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#fcd116]/20 border border-[#fcd116]/30 flex items-center justify-center text-[#fcd116] text-xs font-black flex-shrink-0">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{adminName}</p>
            <p className="text-[9px] text-white/30 font-semibold">Administrateur</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
