import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BfRestaurant } from "../../types";
import { Store, Trash2, Plus, MapPin, Phone, RefreshCw } from "lucide-react";

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<BfRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", location: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bf_restaurants").select("*")
      .order("created_at", { ascending: false });
    setRestaurants(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const ch = supabase.channel("restaurants_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "bf_restaurants" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleDelete = async (r: BfRestaurant) => {
    if (!confirm(`Retirer "${r.name}" définitivement ?`)) return;
    const { error } = await supabase.from("bf_restaurants").delete().eq("id", r.id);
    if (error) return showToast("err", error.message);
    setRestaurants(p => p.filter(x => x.id !== r.id));
    showToast("ok", `"${r.name}" retiré avec succès.`);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      return showToast("err", "Nom et localisation obligatoires.");
    }
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) { setSaving(false); return showToast("err", "Non authentifié."); }

    const { error } = await supabase.from("bf_restaurants").insert({
      owner_id: uid, name: form.name.trim(),
      location: form.location.trim(), phone: form.phone.trim() || null,
    });
    setSaving(false);
    if (error) return showToast("err", error.message);
    setForm({ name: "", location: "", phone: "" });
    showToast("ok", `"${form.name}" enregistré dans bf_restaurants !`);
    await fetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Restaurants & Maquis</h1>
          <p className="text-sm text-white/40 mt-1">{restaurants.length} établissement{restaurants.length > 1 ? "s" : ""} enregistré{restaurants.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={fetch} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition cursor-pointer">
          <RefreshCw size={16} />
        </button>
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
        {/* Formulaire ajout */}
        <div className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-black text-[#fcd116] uppercase tracking-wider flex items-center gap-2">
            <Plus size={14} /> Ajouter un établissement
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Nom *</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="ex: Chez Tanti Sika"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#fcd116] transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Localisation *</label>
              <input
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="ex: Cotonou, Fidjrossè"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#fcd116] transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Téléphone</label>
              <input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+229 97 00 00 00"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#fcd116] transition"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full py-2.5 bg-[#fcd116] hover:bg-[#e0b810] text-[#0d1a12] font-black text-sm rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Enregistrement…" : "Ajouter dans Supabase"}
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="lg:col-span-2 bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a2e1f]">
            <p className="text-xs text-white/30 font-mono">table : bf_restaurants</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#fcd116] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Store size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun restaurant enregistré</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a2e1f]">
              {restaurants.map(r => (
                <div key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/2 transition-colors group">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{r.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <MapPin size={9} /> {r.location}
                      </span>
                      {r.phone && (
                        <span className="text-[10px] text-white/30 flex items-center gap-1">
                          <Phone size={9} /> {r.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px] text-white/20 font-mono">{new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(r)}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
