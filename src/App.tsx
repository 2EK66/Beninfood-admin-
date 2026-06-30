import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { AdminTab } from "./types";
import Sidebar from "./components/layout/Sidebar";
import Login from "./components/pages/Login";
import Dashboard from "./components/pages/Dashboard";
import Restaurants from "./components/pages/Restaurants";
import Livreurs from "./components/pages/Livreurs";
import Commandes from "./components/pages/Commandes";
import Finances from "./components/pages/Finances";
import Securite from "./components/pages/Securite";

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [pendingPayouts, setPendingPayouts] = useState(0);

  // ── Vérifier la session au chargement + écouter les changements ──────────
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setCheckingSession(false);
        return;
      }

      const { data: profile } = await supabase
        .from("bf_profiles")
        .select("role, name")
        .eq("id", session.user.id)
        .single();

      if (profile && ["Admin", "Gérant"].includes(profile.role)) {
        setAdminName(profile.name || session.user.email || "Admin");
        setIsAuthenticated(true);
      } else {
        // Compte connecté mais sans droits admin → déconnexion forcée
        await supabase.auth.signOut();
      }

      setCheckingSession(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setAdminName("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Compteur de demandes de reversement en attente (badge sidebar) ───────
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from("bf_payout_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "en_cours");
      setPendingPayouts(count || 0);
    };

    fetchPendingCount();

    const channel = supabase
      .channel("sidebar_payouts_badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bf_payout_requests" },
        fetchPendingCount
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const handleLogin = (name: string) => {
    setAdminName(name);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setAdminName("");
    setActiveTab("dashboard");
  };

  // ── Écran de chargement initial ───────────────────────────────────────────
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#fcd116] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Écran de connexion ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // ── Application principale ────────────────────────────────────────────────
  const renderPage = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "restaurants": return <Restaurants />;
      case "livreurs": return <Livreurs />;
      case "commandes": return <Commandes />;
      case "finances": return <Finances />;
      case "securite": return <Securite />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d]">
      <Sidebar
        active={activeTab}
        onNavigate={setActiveTab}
        onLogout={handleLogout}
        adminName={adminName}
        pendingPayouts={pendingPayouts}
      />
      <main className="ml-60 p-8 max-w-[1400px]">
        {renderPage()}
      </main>
    </div>
  );
}
