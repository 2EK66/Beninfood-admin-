import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BfProfile } from "../../types";
import { ShieldCheck, Users, AlertTriangle, Lock } from "lucide-react";

interface KeystrokeLog {
  id: string; user: string; dwellTime: string;
  flightTime: string; similarity: string;
  status: string; time: string;
}

const MOCK_LOGS: KeystrokeLog[] = [
  { id: "K-501", user: "Léon Kossou (Livreur)", dwellTime: "85ms (Normal)", flightTime: "112ms (Normal)", similarity: "98.4%", status: "Authentifié ✅", time: "Il y a 3 min" },
  { id: "K-500", user: "Inconnu (Tentative)", dwellTime: "142ms (Anormal)", flightTime: "245ms (Anormal)", similarity: "42.1%", status: "Bloqué ⚠️", time: "Il y a 25 min" },
  { id: "K-499", user: "Sylvain Kodjo (Gérant)", dwellTime: "91ms (Normal)", flightTime: "105ms (Normal)", similarity: "96.8%", status: "Authentifié ✅", time: "Il y a 1h" },
];

export default function Securite() {
  const [profiles, setProfiles] = useState<BfProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("bf_profiles").select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setProfiles(data || []); setLoading(false); });
  }, []);

  const byRole = (r: string) => profiles.filter(p => p.role === r).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Sécurité</h1>
        <p className="text-sm text-white/40 mt-1">Biométrie comportementale & gestion des accès</p>
      </div>

      {/* Stats utilisateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { role: "Client", count: byRole("Client"), color: "text-purple-400 bg-purple-500/10" },
          { role: "Gérant", count: byRole("Gérant"), color: "text-emerald-400 bg-emerald-500/10" },
          { role: "Livreur", count: byRole("Livreur"), color: "text-blue-400 bg-blue-500/10" },
          { role: "Admin", count: byRole("Admin"), color: "text-[#fcd116] bg-[#fcd116]/10" },
        ].map(s => (
          <div key={s.role} className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-4">
            <p className={`text-2xl font-black ${s.color.split(" ")[0]}`}>{s.count}</p>
            <p className="text-xs text-white/40 font-semibold mt-1">{s.role}{s.count > 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {/* Infos sécurité */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[#fcd116]" />
            <h2 className="text-sm font-black text-white">Politiques de sécurité actives</h2>
          </div>
          {[
            "RLS activé sur toutes les tables bf_*",
            "Inscription Livreurs bloquée côté mobile",
            "Rate limiting : 10 tentatives auth/15min/IP",
            "Email fictif {tel}@beninfood.bj pour l'auth",
            "Auto-promotion Admin/Livreur bloquée par RLS",
          ].map(p => (
            <div key={p} className="flex items-start gap-2.5 text-sm text-white/60">
              <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              {p}
            </div>
          ))}
        </div>

        <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h2 className="text-sm font-black text-white">Biométrie comportementale (Keystroke)</h2>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Analyse des temps de frappe (Dwell Time & Flight Time) pour détecter les usurpations d'identité sur l'application mobile.
          </p>
          <div className="space-y-2">
            {MOCK_LOGS.map(log => (
              <div key={log.id} className="bg-white/3 border border-white/5 rounded-xl p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white truncate flex-1 mr-2">{log.user}</span>
                  <span className={`text-[9px] font-black ${log.status.includes("Bloqué") ? "text-red-400" : "text-emerald-400"}`}>
                    {log.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[8px] text-white/30 font-mono">
                  <span>Appui: {log.dwellTime}</span>
                  <span>Vol: {log.flightTime}</span>
                  <span>Score: {log.similarity}</span>
                </div>
                <p className="text-[8px] text-white/20 text-right">{log.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Liste tous les profils */}
      <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2e1f]">
          <h2 className="text-sm font-black text-white">Tous les profils enregistrés</h2>
          <p className="text-xs text-white/30 font-mono mt-0.5">table : bf_profiles</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#fcd116] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">Aucun profil</div>
        ) : (
          <div className="divide-y divide-[#1a2e1f]">
            {profiles.map(p => {
              const roleColor: Record<string, string> = {
                Client: "text-purple-300 bg-purple-500/10 border-purple-500/20",
                Gérant: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
                Livreur: "text-blue-300 bg-blue-500/10 border-blue-500/20",
                Admin: "text-[#fcd116] bg-[#fcd116]/10 border-[#fcd116]/20",
              };
              return (
                <div key={p.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/2 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                    {p.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-white/30">+229 {p.phone}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${roleColor[p.role] || "text-white/40 bg-white/5 border-white/10"}`}>
                    {p.role}
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
