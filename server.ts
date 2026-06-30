/**
 * server.ts — Serveur admin BéninFood
 * Sert le build Vite + expose les endpoints sensibles nécessitant
 * la clé service_role (création de comptes Livreurs sans déconnecter l'admin).
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jafhpkbtxcmzufznnbxc.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_SERVICE_KEY) {
  console.warn("⚠️  SUPABASE_SERVICE_KEY manquante — la création de livreurs échouera.");
}

// Client admin avec privilèges service_role (jamais exposé au frontend)
const supabaseAdmin = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// ─── Sécurité ──────────────────────────────────────────────────────────────
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Trop de requêtes admin. Réessayez dans 15 minutes." },
});

function sanitizePhone(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, "").replace(/^229/, "");
}

// ─── Middleware : vérifier que l'appelant est un Admin authentifié ──────────
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ") || !supabaseAdmin) {
    return res.status(401).json({ error: "Non autorisé." });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Session invalide." });
  }

  const { data: profile } = await supabaseAdmin
    .from("bf_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["Admin", "Gérant"].includes(profile.role)) {
    return res.status(403).json({ error: "Accès refusé : droits administrateur requis." });
  }

  next();
}

// ─── ENDPOINT : créer un compte Livreur (sans déconnecter l'admin) ──────────
app.post("/api/admin/create-deliverer", adminLimiter, requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Service admin non configuré (clé manquante)." });
    }

    const { name, phone, password } = req.body;

    if (!name?.trim() || name.trim().length < 2) {
      return res.status(400).json({ error: "Nom complet requis (min. 2 caractères)." });
    }

    const cleanedPhone = sanitizePhone(phone || "");
    if (!/^\d{8}$/.test(cleanedPhone)) {
      return res.status(400).json({ error: "Numéro béninois invalide (8 chiffres requis)." });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Mot de passe : minimum 8 caractères." });
    }

    const fakeEmail = `${cleanedPhone}@beninfood.bj`;

    // Création via l'API admin (n'affecte PAS la session de l'admin connecté)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim(), phone: cleanedPhone, role: "Livreur" },
    });

    if (createErr) {
      if (createErr.message.includes("already") || createErr.code === "email_exists") {
        return res.status(409).json({ error: "Ce numéro de téléphone est déjà enregistré." });
      }
      throw createErr;
    }

    if (!created.user) {
      return res.status(500).json({ error: "Échec de la création du compte." });
    }

    // Créer le profil BéninFood
    const { error: profileErr } = await supabaseAdmin.from("bf_profiles").upsert({
      id: created.user.id,
      name: name.trim(),
      phone: cleanedPhone,
      role: "Livreur",
    });

    if (profileErr) {
      console.error("Erreur création bf_profiles (livreur):", profileErr.message);
    }

    return res.json({
      success: true,
      message: `Compte livreur "${name.trim()}" créé avec succès.`,
      data: { id: created.user.id, name: name.trim(), phone: cleanedPhone },
    });
  } catch (error: any) {
    console.error("create-deliverer error:", error?.message || error);
    return res.status(500).json({ error: "Erreur serveur lors de la création du livreur." });
  }
});

// ─── Santé du serveur ─────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    supabaseAdmin: !!supabaseAdmin,
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { maxAge: "1h" }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ BéninFood Admin Server → http://localhost:${PORT}`);
    console.log(`   Service role : ${supabaseAdmin ? "✅ Configuré" : "⚠️  Manquant"}`);
  });
}

startServer();
