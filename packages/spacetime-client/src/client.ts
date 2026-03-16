import { DbConnection, tables } from "./generated/index";
import type {
  Attachments,
  Badges,
  DmMessages,
  HouseBans,
  HouseMembers,
  Houses,
  Invites,
  MemberRoles,
  Messages,
  Presence,
  Reactions,
  ScreenShares,
  Roles,
  RoomPermissionOverrides,
  Rooms,
  UserBadges,
  Users,
  VoiceStates
} from "./generated/types";

export const SPACETIME_TOKEN_STORAGE_KEY = "houseplan.spacetime.token";
const SPACETIME_CONNECT_TIMEOUT_MS = 10_000;

export type SpacetimeClientConfig = {
  url: string;
  moduleName: string;
  tokenStorageKey?: string;
};

export type AuthReducer = "auth.register" | "auth.login" | "auth.logout" | "auth.assertSession";
export type UserReducer = "user.updateProfile" | "user.updateStatus";
export type HouseReducer =
  | "house.createInvite"
  | "house.createHouse"
  | "house.updateHouse"
  | "house.deleteHouse"
  | "house.joinByInvite"
  | "house.kickMember"
  | "house.revokeInvite"
  | "house.banMember"
  | "house.unbanMember";
export type RoomReducer =
  | "rooms.createRoom"
  | "rooms.updateRoom"
  | "rooms.deleteRoom"
  | "rooms.setRoomPermissionOverride";
export type RoleReducer =
  | "roles.createRole"
  | "roles.updateRole"
  | "roles.deleteRole"
  | "roles.assignRole"
  | "roles.revokeRole";
export type MessageReducer =
  | "messages.sendMessage"
  | "messages.editMessage"
  | "messages.deleteMessage"
  | "messages.addReaction"
  | "messages.removeReaction";
export type DmReducer = "dms.sendDM" | "dms.editDM" | "dms.deleteDM";
export type VoiceReducer =
  | "voice.joinRoom"
  | "voice.leaveRoom"
  | "voice.updateMediaState"
  | "voice.startScreenShare"
  | "voice.stopScreenShare";
export type BadgeReducer = "badges.grantBadge" | "badges.revokeBadge";
export type PresenceStatus = "online" | "idle" | "dnd" | "offline";

export type AuthPayload = {
  username: string;
  password: string;
};

export type UserProfilePayload = {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
};

export type UserStatusPayload = {
  status: PresenceStatus;
  customText?: string;
};

export type HouseCreatePayload = {
  name: string;
  description?: string;
  iconUrl?: string;
  isPublic?: boolean;
  themeId?: string;
  accentColor?: string;
};

export type HouseUpdatePayload = {
  houseId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  isPublic?: boolean;
  themeId?: string;
  accentColor?: string;
};

export type HouseDeletePayload = {
  houseId: string;
};

export type HouseJoinByInvitePayload = {
  code: string;
};

export type HouseKickMemberPayload = {
  houseId: string;
  userId: string;
};

export type HouseCreateInvitePayload = {
  houseId: string;
  maxUses?: number;
  expiresInHours?: number;
};

export type HouseRevokeInvitePayload = {
  houseId: string;
  code: string;
};

export type HouseBanMemberPayload = {
  houseId: string;
  userId: string;
  reason?: string;
};

export type HouseUnbanMemberPayload = {
  houseId: string;
  userId: string;
};

export type HousePayload =
  | HouseCreateInvitePayload
  | HouseCreatePayload
  | HouseUpdatePayload
  | HouseDeletePayload
  | HouseJoinByInvitePayload
  | HouseKickMemberPayload
  | HouseRevokeInvitePayload
  | HouseBanMemberPayload
  | HouseUnbanMemberPayload;

export type RoomCreatePayload = {
  houseId: string;
  name: string;
  type: "chat" | "voice";
  description?: string;
  position?: number;
  slowmodeSeconds?: number;
};

export type RoomUpdatePayload = {
  roomId: string;
  name: string;
  type: "chat" | "voice";
  description?: string;
  position: number;
  slowmodeSeconds: number;
};

export type RoomDeletePayload = {
  roomId: string;
};

export type RoomSetPermissionOverridePayload = {
  roomId: string;
  roleId: string;
  allow: string;
  deny: string;
};

export type RoomPayload =
  | RoomCreatePayload
  | RoomUpdatePayload
  | RoomDeletePayload
  | RoomSetPermissionOverridePayload;

export type RoleCreatePayload = {
  houseId: string;
  name: string;
  color?: string;
  position?: number;
  permissions: string;
};

export type RoleUpdatePayload = {
  roleId: string;
  name: string;
  color?: string;
  position: number;
  permissions: string;
};

export type RoleDeletePayload = {
  roleId: string;
};

export type RoleAssignPayload = {
  houseId: string;
  userId: string;
  roleId: string;
};

export type RoleRevokePayload = {
  houseId: string;
  userId: string;
  roleId: string;
};

export type RolePayload =
  | RoleCreatePayload
  | RoleUpdatePayload
  | RoleDeletePayload
  | RoleAssignPayload
  | RoleRevokePayload;

export type MessageAttachmentPayload = {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type MessageSendPayload = {
  roomId: string;
  content: string;
  threadParentId?: string;
  attachments?: MessageAttachmentPayload[];
};

export type MessageEditPayload = {
  messageId: string;
  content: string;
};

export type MessageDeletePayload = {
  messageId: string;
};

export type MessageReactionPayload = {
  messageId: string;
  emoji: string;
};

export type MessagePayload =
  | MessageSendPayload
  | MessageEditPayload
  | MessageDeletePayload
  | MessageReactionPayload;

export type DmSendPayload = {
  toUserId: string;
  content: string;
};

export type DmEditPayload = {
  dmMessageId: string;
  content: string;
};

export type DmDeletePayload = {
  dmMessageId: string;
};

export type DmPayload = DmSendPayload | DmEditPayload | DmDeletePayload;

export type VoiceJoinPayload = {
  roomId: string;
};

export type VoiceLeavePayload = Record<string, never>;

export type VoiceUpdateMediaStatePayload = {
  muted: boolean;
  cameraOn: boolean;
};

export type VoiceStartScreenSharePayload = Record<string, never>;
export type VoiceStopScreenSharePayload = Record<string, never>;

export type VoicePayload =
  | VoiceJoinPayload
  | VoiceLeavePayload
  | VoiceUpdateMediaStatePayload
  | VoiceStartScreenSharePayload
  | VoiceStopScreenSharePayload;

export type BadgeGrantPayload = {
  houseId: string;
  userId: string;
  badgeName: string;
  badgeIcon?: string;
  badgeType?: "earned" | "achievement" | "house";
};

export type BadgeRevokePayload = {
  houseId: string;
  userId: string;
  badgeId: string;
};

export type BadgePayload = BadgeGrantPayload | BadgeRevokePayload;

export class SpacetimeClient {
  private connection: DbConnection | null = null;
  private connectPromise: Promise<DbConnection> | null = null;
  private hasSubscribedTables = false;

  constructor(private readonly config: SpacetimeClientConfig) {}

  getConfig() {
    return this.config;
  }

  private tokenStorageKey(): string {
    return this.config.tokenStorageKey ?? SPACETIME_TOKEN_STORAGE_KEY;
  }

  private readToken(): string | undefined {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(this.tokenStorageKey()) ?? undefined;
  }

  private writeToken(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.tokenStorageKey(), token);
  }

  private clearToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(this.tokenStorageKey());
  }

  async connect(): Promise<DbConnection> {
    if (this.connection?.isActive) {
      return this.connection;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.connection = null;
        this.connectPromise = null;
        this.hasSubscribedTables = false;
        reject(
          new Error(
            `Timed out connecting to SpacetimeDB after ${SPACETIME_CONNECT_TIMEOUT_MS}ms.`
          )
        );
      }, SPACETIME_CONNECT_TIMEOUT_MS);

      DbConnection.builder()
        .withUri(this.config.url)
        .withDatabaseName(this.config.moduleName)
        .withToken(this.readToken())
        .onConnect((connection, _identity, token) => {
          if (settled) {
            connection.disconnect();
            return;
          }
          settled = true;
          clearTimeout(timeout);

          this.connection = connection;
          if (!this.hasSubscribedTables) {
            connection
              .subscriptionBuilder()
              .onError((ctx) => {
                console.error("Spacetime subscription error:", ctx);
              })
              .subscribe([
                tables.users,
                tables.presence,
                tables.houses,
                tables.houseMembers,
                tables.invites,
                tables.houseBans,
                tables.roles,
                tables.memberRoles,
                tables.roomPermissionOverrides,
                tables.rooms,
                tables.messages,
                tables.dmMessages,
                tables.attachments,
                tables.reactions,
                tables.voiceStates,
                tables.screenShares,
                tables.badges,
                tables.userBadges
              ]);
            this.hasSubscribedTables = true;
          }
          this.writeToken(token);
          resolve(connection);
        })
        .onDisconnect(() => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            this.connection = null;
            this.connectPromise = null;
            this.hasSubscribedTables = false;
            reject(new Error("Disconnected from SpacetimeDB while establishing connection."));
            return;
          }

          this.connection = null;
          this.connectPromise = null;
          this.hasSubscribedTables = false;
        })
        .onConnectError((_ctx, error) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeout);

          this.connection = null;
          this.connectPromise = null;
          this.hasSubscribedTables = false;
          reject(error);
        })
        .build();
    });

    return this.connectPromise;
  }

  getStoredSessionToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(this.tokenStorageKey());
  }

  async callAuthReducer(
    reducer: AuthReducer,
    payload?: AuthPayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "auth.register") {
      if (!payload) {
        throw new Error("auth.register requires a payload.");
      }
      await connection.reducers.authRegister(payload);
      return;
    }

    if (reducer === "auth.login") {
      if (!payload) {
        throw new Error("auth.login requires a payload.");
      }
      await connection.reducers.authLogin(payload);
      return;
    }

    if (reducer === "auth.assertSession") {
      await connection.reducers.authAssertSession({});
      return;
    }

    try {
      await connection.reducers.authLogout({});
    } finally {
      this.clearToken();
    }
  }

  async callUserReducer(
    reducer: UserReducer,
    payload: UserProfilePayload | UserStatusPayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "user.updateProfile") {
      const profilePayload = payload as UserProfilePayload;
      await connection.reducers.userUpdateProfile({
        displayName: profilePayload.displayName,
        bio: profilePayload.bio ?? "",
        avatarUrl: profilePayload.avatarUrl ?? ""
      });
      return;
    }

    const statusPayload = payload as UserStatusPayload;
    await connection.reducers.userUpdateStatus({
      status: statusPayload.status,
      customText: statusPayload.customText ?? ""
    });
  }

  async callHouseReducer(
    reducer: HouseReducer,
    payload: HousePayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "house.createInvite") {
      const housePayload = payload as HouseCreateInvitePayload;
      const expiresInSeconds =
        housePayload.expiresInHours === undefined
          ? 0
          : Math.max(0, Math.floor(housePayload.expiresInHours * 60 * 60));
      await connection.reducers.houseCreateInvite({
        houseId: housePayload.houseId,
        maxUses: housePayload.maxUses ?? 0,
        expiresInSeconds
      });
      return;
    }

    if (reducer === "house.createHouse") {
      const housePayload = payload as HouseCreatePayload;
      await connection.reducers.houseCreateHouse({
        name: housePayload.name,
        description: housePayload.description ?? "",
        iconUrl: housePayload.iconUrl ?? "",
        isPublic: housePayload.isPublic ?? false,
        themeId: housePayload.themeId ?? "",
        accentColor: housePayload.accentColor ?? ""
      });
      return;
    }

    if (reducer === "house.updateHouse") {
      const housePayload = payload as HouseUpdatePayload;
      await connection.reducers.houseUpdateHouse({
        houseId: housePayload.houseId,
        name: housePayload.name,
        description: housePayload.description ?? "",
        iconUrl: housePayload.iconUrl ?? "",
        isPublic: housePayload.isPublic ?? false,
        themeId: housePayload.themeId ?? "",
        accentColor: housePayload.accentColor ?? ""
      });
      return;
    }

    if (reducer === "house.deleteHouse") {
      const housePayload = payload as HouseDeletePayload;
      await connection.reducers.houseDeleteHouse({
        houseId: housePayload.houseId
      });
      return;
    }

    if (reducer === "house.joinByInvite") {
      const housePayload = payload as HouseJoinByInvitePayload;
      await connection.reducers.houseJoinByInvite({
        code: housePayload.code
      });
      return;
    }

    if (reducer === "house.revokeInvite") {
      const housePayload = payload as HouseRevokeInvitePayload;
      await connection.reducers.houseRevokeInvite({
        houseId: housePayload.houseId,
        code: housePayload.code
      });
      return;
    }

    if (reducer === "house.banMember") {
      const housePayload = payload as HouseBanMemberPayload;
      await connection.reducers.houseBanMember({
        houseId: housePayload.houseId,
        userId: housePayload.userId,
        reason: housePayload.reason ?? ""
      });
      return;
    }

    if (reducer === "house.unbanMember") {
      const housePayload = payload as HouseUnbanMemberPayload;
      await connection.reducers.houseUnbanMember({
        houseId: housePayload.houseId,
        userId: housePayload.userId
      });
      return;
    }

    const housePayload = payload as HouseKickMemberPayload;
    await connection.reducers.houseKickMember({
      houseId: housePayload.houseId,
      userId: housePayload.userId
    });
  }

  async callRoomReducer(
    reducer: RoomReducer,
    payload: RoomPayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "rooms.createRoom") {
      const roomPayload = payload as RoomCreatePayload;
      await connection.reducers.roomsCreateRoom({
        houseId: roomPayload.houseId,
        name: roomPayload.name,
        type: roomPayload.type,
        description: roomPayload.description ?? "",
        position: roomPayload.position,
        slowmodeSeconds: roomPayload.slowmodeSeconds
      });
      return;
    }

    if (reducer === "rooms.updateRoom") {
      const roomPayload = payload as RoomUpdatePayload;
      await connection.reducers.roomsUpdateRoom({
        roomId: roomPayload.roomId,
        name: roomPayload.name,
        type: roomPayload.type,
        description: roomPayload.description ?? "",
        position: roomPayload.position,
        slowmodeSeconds: roomPayload.slowmodeSeconds
      });
      return;
    }

    if (reducer === "rooms.setRoomPermissionOverride") {
      const roomPayload = payload as RoomSetPermissionOverridePayload;
      await connection.reducers.roomsSetRoomPermissionOverride({
        roomId: roomPayload.roomId,
        roleId: roomPayload.roleId,
        allow: roomPayload.allow,
        deny: roomPayload.deny
      });
      return;
    }

    const roomPayload = payload as RoomDeletePayload;
    await connection.reducers.roomsDeleteRoom({
      roomId: roomPayload.roomId
    });
  }

  async callRoleReducer(
    reducer: RoleReducer,
    payload: RolePayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "roles.createRole") {
      const rolePayload = payload as RoleCreatePayload;
      await connection.reducers.rolesCreateRole({
        houseId: rolePayload.houseId,
        name: rolePayload.name,
        color: rolePayload.color ?? "",
        position: rolePayload.position,
        permissions: rolePayload.permissions
      });
      return;
    }

    if (reducer === "roles.updateRole") {
      const rolePayload = payload as RoleUpdatePayload;
      await connection.reducers.rolesUpdateRole({
        roleId: rolePayload.roleId,
        name: rolePayload.name,
        color: rolePayload.color ?? "",
        position: rolePayload.position,
        permissions: rolePayload.permissions
      });
      return;
    }

    if (reducer === "roles.deleteRole") {
      const rolePayload = payload as RoleDeletePayload;
      await connection.reducers.rolesDeleteRole({
        roleId: rolePayload.roleId
      });
      return;
    }

    if (reducer === "roles.assignRole") {
      const rolePayload = payload as RoleAssignPayload;
      await connection.reducers.rolesAssignRole({
        houseId: rolePayload.houseId,
        userId: rolePayload.userId,
        roleId: rolePayload.roleId
      });
      return;
    }

    const rolePayload = payload as RoleRevokePayload;
    await connection.reducers.rolesRevokeRole({
      houseId: rolePayload.houseId,
      userId: rolePayload.userId,
      roleId: rolePayload.roleId
    });
  }

  async callMessageReducer(
    reducer: MessageReducer,
    payload: MessagePayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "messages.sendMessage") {
      const messagePayload = payload as MessageSendPayload;
      await connection.reducers.messagesSendMessage({
        roomId: messagePayload.roomId,
        content: messagePayload.content,
        threadParentId: messagePayload.threadParentId ?? "",
        attachmentsJson: JSON.stringify(messagePayload.attachments ?? [])
      });
      return;
    }

    if (reducer === "messages.editMessage") {
      const messagePayload = payload as MessageEditPayload;
      await connection.reducers.messagesEditMessage({
        messageId: messagePayload.messageId,
        content: messagePayload.content
      });
      return;
    }

    if (reducer === "messages.deleteMessage") {
      const messagePayload = payload as MessageDeletePayload;
      await connection.reducers.messagesDeleteMessage({
        messageId: messagePayload.messageId
      });
      return;
    }

    if (reducer === "messages.addReaction") {
      const messagePayload = payload as MessageReactionPayload;
      await connection.reducers.messagesAddReaction({
        messageId: messagePayload.messageId,
        emoji: messagePayload.emoji
      });
      return;
    }

    const messagePayload = payload as MessageReactionPayload;
    await connection.reducers.messagesRemoveReaction({
      messageId: messagePayload.messageId,
      emoji: messagePayload.emoji
    });
  }

  async callDmReducer(
    reducer: DmReducer,
    payload: DmPayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "dms.sendDM") {
      const dmPayload = payload as DmSendPayload;
      await connection.reducers.dmsSendDm({
        toUserId: dmPayload.toUserId,
        content: dmPayload.content
      });
      return;
    }

    if (reducer === "dms.editDM") {
      const dmPayload = payload as DmEditPayload;
      await connection.reducers.dmsEditDm({
        dmMessageId: dmPayload.dmMessageId,
        content: dmPayload.content
      });
      return;
    }

    const dmPayload = payload as DmDeletePayload;
    await connection.reducers.dmsDeleteDm({
      dmMessageId: dmPayload.dmMessageId
    });
  }

  async callVoiceReducer(
    reducer: VoiceReducer,
    payload?: VoicePayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "voice.joinRoom") {
      const voicePayload = payload as VoiceJoinPayload | undefined;
      if (!voicePayload) {
        throw new Error("voice.joinRoom requires a payload.");
      }
      await connection.reducers.voiceJoinRoom({
        roomId: voicePayload.roomId
      });
      return;
    }

    if (reducer === "voice.updateMediaState") {
      const voicePayload = payload as VoiceUpdateMediaStatePayload | undefined;
      if (!voicePayload) {
        throw new Error("voice.updateMediaState requires a payload.");
      }
      await connection.reducers.voiceUpdateMediaState({
        muted: voicePayload.muted,
        cameraOn: voicePayload.cameraOn
      });
      return;
    }

    if (reducer === "voice.startScreenShare") {
      const startScreenShare = (connection.reducers as Record<string, (params: object) => Promise<void>>)
        .voiceStartScreenShare;
      if (!startScreenShare) {
        throw new Error("voice.startScreenShare reducer is unavailable.");
      }
      await startScreenShare({});
      return;
    }

    if (reducer === "voice.stopScreenShare") {
      const stopScreenShare = (connection.reducers as Record<string, (params: object) => Promise<void>>)
        .voiceStopScreenShare;
      if (!stopScreenShare) {
        throw new Error("voice.stopScreenShare reducer is unavailable.");
      }
      await stopScreenShare({});
      return;
    }

    await connection.reducers.voiceLeaveRoom({});
  }

  async callBadgeReducer(
    reducer: BadgeReducer,
    payload: BadgePayload
  ): Promise<void> {
    const connection = await this.connect();

    if (reducer === "badges.grantBadge") {
      const badgePayload = payload as BadgeGrantPayload;
      await connection.reducers.badgesGrantBadge({
        houseId: badgePayload.houseId,
        userId: badgePayload.userId,
        badgeName: badgePayload.badgeName,
        badgeIcon: badgePayload.badgeIcon ?? "",
        badgeType: badgePayload.badgeType ?? "house"
      });
      return;
    }

    const badgePayload = payload as BadgeRevokePayload;
    await connection.reducers.badgesRevokeBadge({
      houseId: badgePayload.houseId,
      userId: badgePayload.userId,
      badgeId: badgePayload.badgeId
    });
  }

  async listUsers(): Promise<Users[]> {
    const connection = await this.connect();
    return Array.from(connection.db.users.iter());
  }

  async listPresence(): Promise<Presence[]> {
    const connection = await this.connect();
    return Array.from(connection.db.presence.iter());
  }

  async listHouses(): Promise<Houses[]> {
    const connection = await this.connect();
    return Array.from(connection.db.houses.iter());
  }

  async listHouseMembers(): Promise<HouseMembers[]> {
    const connection = await this.connect();
    return Array.from(connection.db.houseMembers.iter());
  }

  async listInvites(): Promise<Invites[]> {
    const connection = await this.connect();
    return Array.from(connection.db.invites.iter());
  }

  async listHouseBans(): Promise<HouseBans[]> {
    const connection = await this.connect();
    return Array.from(connection.db.houseBans.iter());
  }

  async listRooms(): Promise<Rooms[]> {
    const connection = await this.connect();
    return Array.from(connection.db.rooms.iter());
  }

  async listRoles(): Promise<Roles[]> {
    const connection = await this.connect();
    return Array.from(connection.db.roles.iter());
  }

  async listMemberRoles(): Promise<MemberRoles[]> {
    const connection = await this.connect();
    return Array.from(connection.db.memberRoles.iter());
  }

  async listRoomPermissionOverrides(): Promise<RoomPermissionOverrides[]> {
    const connection = await this.connect();
    return Array.from(connection.db.roomPermissionOverrides.iter());
  }

  async listMessages(): Promise<Messages[]> {
    const connection = await this.connect();
    return Array.from(connection.db.messages.iter());
  }

  async listAttachments(): Promise<Attachments[]> {
    const connection = await this.connect();
    return Array.from(connection.db.attachments.iter());
  }

  async listReactions(): Promise<Reactions[]> {
    const connection = await this.connect();
    return Array.from(connection.db.reactions.iter());
  }

  async listDmMessages(): Promise<DmMessages[]> {
    const connection = await this.connect();
    return Array.from(connection.db.dmMessages.iter());
  }

  async listVoiceStates(): Promise<VoiceStates[]> {
    const connection = await this.connect();
    return Array.from(connection.db.voiceStates.iter());
  }

  async listBadges(): Promise<Badges[]> {
    const connection = await this.connect();
    return Array.from(connection.db.badges.iter());
  }

  async listUserBadges(): Promise<UserBadges[]> {
    const connection = await this.connect();
    return Array.from(connection.db.userBadges.iter());
  }

  async listScreenShares(): Promise<ScreenShares[]> {
    const connection = await this.connect();
    const screenSharesTable = (connection.db as unknown as { screenShares: { iter: () => Iterable<ScreenShares> } })
      .screenShares;
    return Array.from(screenSharesTable.iter());
  }

  getConnection(): DbConnection | null {
    return this.connection?.isActive ? this.connection : null;
  }
}

let singleton: SpacetimeClient | null = null;

export function getSpacetimeClient(config?: SpacetimeClientConfig): SpacetimeClient {
  if (!singleton) {
    if (!config) {
      throw new Error("Spacetime client has not been initialized.");
    }
    singleton = new SpacetimeClient(config);
  }
  return singleton;
}
