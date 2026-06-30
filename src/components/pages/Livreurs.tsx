import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BfProfile } from "../../types";
import { Bike, UserPlus, ShieldAlert, Trash2, RefreshCw, Phone } from "lucide-react";

export default function Livreurs() {
  const [livreurs, setLivreurs] = useState<BfProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLivreurs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bf_profiles")
      .select("*")
      .eq("role", "Livreur")
      .order("created_at", { ascending: false });
    setLivreurs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLivreurs(); }, []);

  const sanitizePhone = (p: string) => p.replace(/[\s\-\+\(\)]/g, "").replace(/^229/, "");

  const handleCreate = async () => {
    const cleanPhone = sanitizePhone(form.phone);
    if (!form.name.trim()) return showToast("err", "Le nom est obligatoire.");
    if (cleanPhone.length < 8) return showToast("err", "Numéro béninois invalide (8 chiffres).");
    if (form.password.length < 8) return showToast("err", "Mot de passe : minimum 8 caractères.");

    setSaving(true);

    // Récupérer le token de session admin pour authentifier la requête
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      return showToast("err", "Session expirée. Reconnectez-vous.");
    }

    // Appel au serveur (service_role) — ne déconnecte PAS l'admin
    const res = await fetch("/api/admin/create-deliverer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name: form.name.trim(), phone: cleanPhone, password: form.password }),
    });
    const result = await res.json();

    setSaving(false);

    if (!res.ok || result.error) {
      return showToast("err", result.error || "Erreur lors de la création du livreur.");
    }

    setForm({ name: "", phone: "", password: "" });
    showToast("ok", `Compte livreur "${form.name}" créé ! Il peut se connecter sur l'app mobile.`);
    await fetchLivreurs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Livreurs</h1>
          <p className="text-sm text-white/40 mt-1">{livreurs.length} livreur{livreurs.length > 1 ? "s" : ""} enregistré{livreurs.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={fetchLivreurs} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition cursor-pointer">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Alerte sécurité */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
        <ShieldAlert size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-200 leading-relaxed">
          <strong>Sécurité BéninFood :</strong> Les livreurs ne peuvent pas s'inscrire eux-mêmes sur l'application mobile. Leurs comptes sont créés <strong>exclusivement depuis ce back-office</strong> par un administrateur.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
          toast.type === "ok"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-red-500/10 border-red-500/20 text-red-300"
        }`}>{toast.msg}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulaire création */}
        <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-black text-[#fcd116] uppercase tracking-wider flex items-center gap-2">
            <UserPlus size={14} /> Créer un compte livreur
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Nom complet *</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="ex: Léon Kossou"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#fcd116] transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Téléphone béninois *</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[#fcd116] transition">
                <span className="text-white/30 text-sm font-bold mr-2">+229</span>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="97 00 00 00"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Mot de passe *</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Min. 8 caractères"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#fcd116] transition"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full py-2.5 bg-[#fcd116] hover:bg-[#e0b810] text-[#0d1a12] font-black text-sm rounded-xl transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus size={15} />
              {saving ? "Création…" : "Créer le compte livreur"}
            </button>
          </div>
        </div>

        {/* Liste des livreurs */}
        <div className="lg:col-span-2 bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a2e1f]">
            <p className="text-xs text-white/30 font-mono">table : bf_profiles WHERE role = 'Livreur'</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#fcd116] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : livreurs.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Bike size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun livreur enregistré</p>
              <p className="text-xs mt-1">Utilisez le formulaire pour créer le premier compte</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a2e1f]">
              {livreurs.map(l => (
                <div key={l.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/2 transition-colors group">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-400 font-black text-sm">
                    {l.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{l.name}</p>
                    <p className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                      <Phone size={9} /> +229 {l.phone}
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                    Livreur
                  </span>
                  {l.created_at && (
                    <p className="text-[9px] text-white/20 font-mono flex-shrink-0">
                      {new Date(l.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
