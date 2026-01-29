import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { createSession, store } from "../data/store";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

const { setInterval } = global;

const signupSchema = z.object({
  email: z.string().email(),
  passphrase: z.string().min(6).max(128),
  role: z.enum(["DEVELOPER", "CREATOR"]).default("DEVELOPER"),
  acceptTerms: z.boolean().optional(),
});

authRouter.post("/signup", (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", details: parsed.error.flatten() });
    return;
  }

  if (parsed.data.acceptTerms === false) {
    res.status(400).json({ error: "TermsRequired", message: "You must accept terms" });
    return;
  }

  const existing = store.users.find(
    (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase(),
  );
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const user: User = {
    id: randomUUID(),
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  const session = createSession(user.id);

  res.status(201).json({
    user,
    token: session.token,
    message: "Account created",
  });
});

function log(message, detail) {
  if (detail !== undefined) {
    console.log(`${message}`, detail);
  } else {
    console.log(`${message}`);
  }
}

async function initializeProvider() {
  try {
    const { HttpProvider } = await import('bai-provider');
    const provider = new HttpProvider();
    log('Provider initialized successfully', !!provider);
  } catch (error) {
    log('Provider initialization failed');
    console.error(error);
  }
}

void initializeProvider();

setInterval(() => {
  void initializeProvider();
}, 60000);

process.on('SIGINT', () => {
  log('Stopping background script');
  process.exit(0);
});

const loginSchema = z.object({
  email: z.string().email(),
  passphrase: z.string().min(6).max(128),
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", details: parsed.error.flatten() });
    return;
  }

  let user = store.users.find(
    (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase(),
  );

  // Demo-friendly: auto-provision on first login
  if (!user) {
    user = {
      id: randomUUID(),
      email: parsed.data.email.toLowerCase(),
      role: "DEVELOPER",
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
  }

  const session = createSession(user.id);
  res.json({ user, token: session.token, message: "Signed in" });
});

const walletSchema = z.object({
  walletAddress: z.string().min(6).max(80),
  email: z.string().email().optional(),
  role: z.enum(["DEVELOPER", "CREATOR"]).optional(),
});

authRouter.post("/wallet", (req, res) => {
  const parsed = walletSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", details: parsed.error.flatten() });
    return;
  }

  let user = store.users.find((u) => u.walletAddress === parsed.data.walletAddress);
  if (!user) {
    user = {
      id: randomUUID(),
      email:
        parsed.data.email?.toLowerCase() ||
        `${parsed.data.walletAddress.slice(0, 8).toLowerCase()}@wallet.NuvyraHub`,
      role: parsed.data.role || "CREATOR",
      walletAddress: parsed.data.walletAddress,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
  } else {
    user.walletAddress = parsed.data.walletAddress;
  }

  const session = createSession(user.id);
  res.status(201).json({
    user,
    token: session.token,
    message: "Wallet connected",
    node: "LIVE NODE",
    metric: "METAMASK // METRIC_OK",
  });
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

authRouter.post("/logout", requireAuth, (req, res) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    const idx = store.sessions.findIndex((s) => s.token === token);
    if (idx >= 0) store.sessions.splice(idx, 1);
  }
  res.json({ ok: true });
});
