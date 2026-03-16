import { t } from "spacetimedb/server";
import {
  PROFILE_SCHEMA,
  STATUS_SCHEMA,
  recordEvent,
  requireAuthenticatedUser,
  spacetimedb,
  upsertPresence
} from "../shared.js";

export const userUpdateProfile = spacetimedb.reducer(
  {
    displayName: t.string(),
    bio: t.string(),
    avatarUrl: t.string()
  },
  (ctx, args) => {
    const parsed = PROFILE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid profile payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    ctx.db.users.delete(user);
    ctx.db.users.insert({
      ...user,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      avatarUrl: parsed.data.avatarUrl
    });

    recordEvent(ctx, "user_profile_updated", `userId=${user.id}`);
  }
);

export const userUpdateStatus = spacetimedb.reducer(
  {
    status: t.string(),
    customText: t.string()
  },
  (ctx, args) => {
    const parsed = STATUS_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid status payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    upsertPresence(ctx, user.id, parsed.data.status, parsed.data.customText);
    recordEvent(ctx, "user_status_updated", `userId=${user.id}`);
  }
);
