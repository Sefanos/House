import { t } from "spacetimedb/server";
import {
  clearScreenShare,
  LOGIN_SCHEMA,
  REGISTER_SCHEMA,
  findSessionByToken,
  findUserByUsername,
  hashPassword,
  identityToken,
  nowIso,
  recordEvent,
  requireAuthenticatedUser,
  spacetimedb,
  upsertPresence,
  upsertVoiceState,
  upsertSession
} from "../shared.js";

export const authRegister = spacetimedb.reducer(
  {
    username: t.string(),
    password: t.string()
  },
  (ctx, args) => {
    const parsed = REGISTER_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid register payload.");
    }

    const username = parsed.data.username;
    const passwordHash = hashPassword(parsed.data.password);
    const existing = findUserByUsername(ctx, username);
    if (existing) {
      throw new Error("Username already exists.");
    }

    const user = ctx.db.users.insert({
      id: ctx.newUuidV7().toString(),
      username,
      passwordHash,
      displayName: username,
      avatarUrl: "",
      bio: "",
      createdAt: nowIso()
    });

    upsertSession(ctx, user.id);
    upsertPresence(ctx, user.id, "online", "");
    upsertVoiceState(ctx, user.id, true, false);
    clearScreenShare(ctx, user.id);
    recordEvent(ctx, "user_registered", `username=${username}`);
  }
);

export const authLogin = spacetimedb.reducer(
  {
    username: t.string(),
    password: t.string()
  },
  (ctx, args) => {
    const parsed = LOGIN_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid login payload.");
    }

    const username = parsed.data.username;
    const user = findUserByUsername(ctx, username);
    if (!user) {
      throw new Error("Invalid username or password.");
    }

    const passwordHash = hashPassword(parsed.data.password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Invalid username or password.");
    }

    upsertSession(ctx, user.id);
    upsertPresence(ctx, user.id, "online", "");
    upsertVoiceState(ctx, user.id, true, false);
    clearScreenShare(ctx, user.id);
    recordEvent(ctx, "user_logged_in", `username=${username}`);
  }
);

export const authLogout = spacetimedb.reducer((ctx) => {
  const token = identityToken(ctx);
  const session = findSessionByToken(ctx, token);
  if (!session) {
    throw new Error("Session not found.");
  }

  ctx.db.sessions.delete(session);
  ctx.db.sessions.insert({
    ...session,
    expiresAt: nowIso()
  });
  upsertPresence(ctx, session.userId, "offline", "", "", "");
  upsertVoiceState(ctx, session.userId, true, false);
  clearScreenShare(ctx, session.userId);
  recordEvent(ctx, "user_logged_out", "session revoked");
});

export const authAssertSession = spacetimedb.reducer((ctx) => {
  requireAuthenticatedUser(ctx);
});
