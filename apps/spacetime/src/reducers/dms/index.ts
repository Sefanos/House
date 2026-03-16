import { t } from "spacetimedb/server";
import {
  DM_DELETE_SCHEMA,
  DM_EDIT_SCHEMA,
  DM_SEND_SCHEMA,
  canonicalConversationKey,
  findDMMessageById,
  findUserById,
  nowIso,
  recordEvent,
  requireAuthenticatedUser,
  spacetimedb
} from "../shared.js";

export const dmsSendDM = spacetimedb.reducer(
  {
    toUserId: t.string(),
    content: t.string()
  },
  (ctx, args) => {
    const parsed = DM_SEND_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid send DM payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    if (parsed.data.toUserId === user.id) {
      throw new Error("You cannot DM yourself.");
    }

    const targetUser = findUserById(ctx, parsed.data.toUserId);
    if (!targetUser) {
      throw new Error("Target user not found.");
    }

    const dmMessageId = ctx.newUuidV7().toString();
    const conversationKey = canonicalConversationKey(user.id, targetUser.id);

    ctx.db.dmMessages.insert({
      id: dmMessageId,
      conversationKey,
      fromUserId: user.id,
      toUserId: targetUser.id,
      content: parsed.data.content,
      editedAt: "",
      deletedAt: "",
      createdAt: nowIso()
    });

    recordEvent(
      ctx,
      "dm_sent",
      `dmMessageId=${dmMessageId};fromUserId=${user.id};toUserId=${targetUser.id};conversationKey=${conversationKey}`
    );
  }
);

export const dmsEditDM = spacetimedb.reducer(
  {
    dmMessageId: t.string(),
    content: t.string()
  },
  (ctx, args) => {
    const parsed = DM_EDIT_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid edit DM payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const dmMessage = findDMMessageById(ctx, parsed.data.dmMessageId);
    if (!dmMessage) {
      throw new Error("DM message not found.");
    }

    if (dmMessage.fromUserId !== user.id) {
      throw new Error("Only the DM author can edit this message.");
    }

    if (dmMessage.deletedAt) {
      throw new Error("Cannot edit a deleted DM.");
    }

    ctx.db.dmMessages.delete(dmMessage);
    ctx.db.dmMessages.insert({
      ...dmMessage,
      content: parsed.data.content,
      editedAt: nowIso()
    });

    recordEvent(ctx, "dm_edited", `dmMessageId=${dmMessage.id};authorId=${user.id}`);
  }
);

export const dmsDeleteDM = spacetimedb.reducer(
  {
    dmMessageId: t.string()
  },
  (ctx, args) => {
    const parsed = DM_DELETE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid delete DM payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const dmMessage = findDMMessageById(ctx, parsed.data.dmMessageId);
    if (!dmMessage) {
      throw new Error("DM message not found.");
    }

    if (dmMessage.fromUserId !== user.id) {
      throw new Error("Only the DM author can delete this message.");
    }

    if (dmMessage.deletedAt) {
      return;
    }

    ctx.db.dmMessages.delete(dmMessage);
    ctx.db.dmMessages.insert({
      ...dmMessage,
      content: "",
      deletedAt: nowIso()
    });

    recordEvent(ctx, "dm_deleted", `dmMessageId=${dmMessage.id};authorId=${user.id}`);
  }
);
