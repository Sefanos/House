import { Permission } from "@houseplan/types";
import { t } from "spacetimedb/server";
import { hasPermission } from "../../lib/permissions";
import {
  MESSAGE_DELETE_SCHEMA,
  MESSAGE_EDIT_SCHEMA,
  MESSAGE_REACTION_SCHEMA,
  MESSAGE_SEND_SCHEMA,
  deleteMessageArtifacts,
  findMessageById,
  findReaction,
  findRoomById,
  nowIso,
  parseMessageAttachments,
  recordEvent,
  requireAuthenticatedUser,
  requireHouseMember,
  requirePermission,
  resolveUserPermissions,
  spacetimedb
} from "../shared.js";

export const messagesSendMessage = spacetimedb.reducer(
  {
    roomId: t.string(),
    content: t.string(),
    threadParentId: t.string(),
    attachmentsJson: t.string()
  },
  (ctx, args) => {
    const parsed = MESSAGE_SEND_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid send message payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const room = findRoomById(ctx, parsed.data.roomId);
    if (!room) {
      throw new Error("Room not found.");
    }
    if (room.type !== "chat") {
      throw new Error("Messages can only be sent in chat rooms.");
    }
    requireHouseMember(ctx, room.houseId, user.id);
    requirePermission(ctx, room.houseId, user.id, Permission.SEND_MESSAGES, room.id);

    const threadParentId = parsed.data.threadParentId.trim();
    let normalizedThreadParentId = "";
    if (threadParentId) {
      requirePermission(ctx, room.houseId, user.id, Permission.USE_THREADS, room.id);
      const parentMessage = findMessageById(ctx, threadParentId);
      if (!parentMessage || parentMessage.roomId !== room.id) {
        throw new Error("Thread parent message not found.");
      }
      normalizedThreadParentId = parentMessage.threadParentId || parentMessage.id;
    }

    const attachments = parseMessageAttachments(parsed.data.attachmentsJson);
    if (attachments.length > 0) {
      requirePermission(ctx, room.houseId, user.id, Permission.ATTACH_FILES, room.id);
    }
    const createdAt = nowIso();
    const messageId = ctx.newUuidV7().toString();

    ctx.db.messages.insert({
      id: messageId,
      roomId: room.id,
      authorId: user.id,
      content: parsed.data.content,
      editedAt: "",
      deletedAt: "",
      threadParentId: normalizedThreadParentId,
      isPinned: false,
      createdAt
    });

    for (const attachment of attachments) {
      ctx.db.attachments.insert({
        id: ctx.newUuidV7().toString(),
        messageId,
        url: attachment.url,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        createdAt
      });
    }

    recordEvent(
      ctx,
      "message_sent",
      `messageId=${messageId};roomId=${room.id};userId=${user.id};attachments=${attachments.length}`
    );
  }
);

export const messagesEditMessage = spacetimedb.reducer(
  {
    messageId: t.string(),
    content: t.string()
  },
  (ctx, args) => {
    const parsed = MESSAGE_EDIT_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid edit message payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const message = findMessageById(ctx, parsed.data.messageId);
    if (!message) {
      throw new Error("Message not found.");
    }
    if (message.authorId !== user.id) {
      throw new Error("Only the message author can edit this message.");
    }
    if (message.deletedAt) {
      throw new Error("Cannot edit a deleted message.");
    }

    const room = findRoomById(ctx, message.roomId);
    if (!room) {
      throw new Error("Room not found for message.");
    }
    requireHouseMember(ctx, room.houseId, user.id);

    ctx.db.messages.delete(message);
    ctx.db.messages.insert({
      ...message,
      content: parsed.data.content,
      editedAt: nowIso()
    });

    recordEvent(ctx, "message_edited", `messageId=${message.id};roomId=${message.roomId};userId=${user.id}`);
  }
);

export const messagesDeleteMessage = spacetimedb.reducer(
  {
    messageId: t.string()
  },
  (ctx, args) => {
    const parsed = MESSAGE_DELETE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid delete message payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const message = findMessageById(ctx, parsed.data.messageId);
    if (!message) {
      throw new Error("Message not found.");
    }

    const room = findRoomById(ctx, message.roomId);
    if (!room) {
      throw new Error("Room not found for message.");
    }
    const house = requireHouseMember(ctx, room.houseId, user.id);

    const canDelete =
      message.authorId === user.id ||
      house.ownerId === user.id ||
      hasPermission(resolveUserPermissions(ctx, room.houseId, user.id, room.id), Permission.MANAGE_MESSAGES);
    if (!canDelete) {
      throw new Error("Only the message author, house owner, or a manager can delete this message.");
    }
    if (message.deletedAt) {
      return;
    }

    deleteMessageArtifacts(ctx, message.id);
    ctx.db.messages.delete(message);
    ctx.db.messages.insert({
      ...message,
      content: "",
      deletedAt: nowIso()
    });

    recordEvent(ctx, "message_deleted", `messageId=${message.id};roomId=${message.roomId};userId=${user.id}`);
  }
);

export const messagesAddReaction = spacetimedb.reducer(
  {
    messageId: t.string(),
    emoji: t.string()
  },
  (ctx, args) => {
    const parsed = MESSAGE_REACTION_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid reaction payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const message = findMessageById(ctx, parsed.data.messageId);
    if (!message) {
      throw new Error("Message not found.");
    }
    if (message.deletedAt) {
      throw new Error("Cannot react to a deleted message.");
    }

    const room = findRoomById(ctx, message.roomId);
    if (!room) {
      throw new Error("Room not found for message.");
    }
    requireHouseMember(ctx, room.houseId, user.id);
    requirePermission(ctx, room.houseId, user.id, Permission.ADD_REACTIONS, room.id);

    const emoji = parsed.data.emoji.trim();
    const existing = findReaction(ctx, message.id, user.id, emoji);
    if (existing) {
      return;
    }

    const reactionId = ctx.newUuidV7().toString();
    ctx.db.reactions.insert({
      id: reactionId,
      messageId: message.id,
      userId: user.id,
      emoji,
      createdAt: nowIso()
    });

    recordEvent(
      ctx,
      "message_reaction_added",
      `reactionId=${reactionId};messageId=${message.id};emoji=${emoji};userId=${user.id}`
    );
  }
);

export const messagesRemoveReaction = spacetimedb.reducer(
  {
    messageId: t.string(),
    emoji: t.string()
  },
  (ctx, args) => {
    const parsed = MESSAGE_REACTION_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid reaction payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const message = findMessageById(ctx, parsed.data.messageId);
    if (!message) {
      throw new Error("Message not found.");
    }

    const room = findRoomById(ctx, message.roomId);
    if (!room) {
      throw new Error("Room not found for message.");
    }
    requireHouseMember(ctx, room.houseId, user.id);
    requirePermission(ctx, room.houseId, user.id, Permission.ADD_REACTIONS, room.id);

    const emoji = parsed.data.emoji.trim();
    const reaction = findReaction(ctx, message.id, user.id, emoji);
    if (!reaction) {
      throw new Error("Reaction not found.");
    }

    ctx.db.reactions.delete(reaction);
    recordEvent(ctx, "message_reaction_removed", `messageId=${message.id};emoji=${emoji};userId=${user.id}`);
  }
);
