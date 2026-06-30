import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { ShoppingCart, Mail, Lock, LogIn, AlertCircle } from "lucide-react";

interface Props { onLogin: (name: string) => void; }

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Renseignez votre email et mot de passe.");
    setLoading(true);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    if (authErr || !data.user) {
      setLoading(false);
      return setError("Identifiants incorrects ou compte non administrateur.");
    }

    // Vérifier que le profil est Admin
    const { data: profile } = await supabase
      .from("bf_profiles").select("role, name").eq("id", data.user.id).single();

    if (!profile || !["Admin", "Gérant"].includes(profile.role)) {
      await supabase.auth.signOut();
      setLoading(false);
      return setError("Accès refusé. Ce compte n'a pas les droits administrateur.");
    }

    setLoading(false);
    onLogin(profile.name || email);
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center p-4">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#fcd116] rounded-full blur-[120px] opacity-5" />
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-5" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#fcd116] rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-[#fcd116]/20 mb-4">
            <ShoppingCart size={24} className="text-[#0d1a12]" />
          </div>
          <h1 className="text-2xl font-black text-white">
            Bénin<span className="text-[#fcd116]">Food</span>
          </h1>
          <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mt-1">
            Administration
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-[#0d1a12] border border-[#1a2e1f] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black text-white mb-5">Connexion administrateur</h2>

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">
              Adresse email
            </label>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[#fcd116] transition">
              <Mail size={15} className="text-white/30 mr-2.5 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@beninfood.bj"
                autoComplete="email"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/20 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">
              Mot de passe
            </label>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[#fcd116] transition">
              <Lock size={15} className="text-white/30 mr-2.5 flex-shrink-0" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/20 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#fcd116] hover:bg-[#e0b810] text-[#0d1a12] font-black text-sm rounded-xl transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <LogIn size={16} />
            {loading ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>

        {/* Ribbon Bénin */}
        <div className="flex mt-6 h-1 rounded-full overflow-hidden mx-auto w-24">
          <div className="bg-emerald-500 flex-1" />
          <div className="bg-[#fcd116] flex-1" />
          <div className="bg-red-500 flex-1" />
        </div>
      </div>
    </div>
  );
}
