import {
  SPACETIME_TOKEN_STORAGE_KEY,
  getSpacetimeClient,
  type AuthPayload,
  type AuthReducer,
  type HouseBanMemberPayload,
  type HouseCreateInvitePayload,
  type HouseCreatePayload,
  type HouseDeletePayload,
  type HouseJoinByInvitePayload,
  type HouseKickMemberPayload,
  type HousePayload,
  type HouseRevokeInvitePayload,
  type HouseReducer,
  type HouseUnbanMemberPayload,
  type HouseUpdatePayload,
  type DmDeletePayload,
  type DmEditPayload,
  type BadgeGrantPayload,
  type BadgePayload,
  type BadgeReducer,
  type BadgeRevokePayload,
  type DmPayload,
  type DmReducer,
  type DmSendPayload,
  type VoiceJoinPayload,
  type VoiceLeavePayload,
  type VoicePayload,
  type VoiceReducer,
  type VoiceUpdateMediaStatePayload,
  type PresenceStatus,
  type MessageAttachmentPayload,
  type MessageDeletePayload,
  type MessageEditPayload,
  type MessagePayload,
  type MessageReactionPayload,
  type MessageReducer,
  type MessageSendPayload,
  type RoleAssignPayload,
  type RoleCreatePayload,
  type RoleDeletePayload,
  type RolePayload,
  type RoleReducer,
  type RoleRevokePayload,
  type RoleUpdatePayload,
  type RoomCreatePayload,
  type RoomDeletePayload,
  type RoomPayload,
  type RoomSetPermissionOverridePayload,
  type RoomReducer,
  type RoomUpdatePayload,
  type UserProfilePayload,
  type UserReducer,
  type UserStatusPayload
} from "@houseplan/spacetime-client";

export type {
  AuthPayload,
  AuthReducer,
  HouseCreatePayload,
  HouseCreateInvitePayload,
  HouseDeletePayload,
  HouseJoinByInvitePayload,
  HouseKickMemberPayload,
  HouseBanMemberPayload,
  HousePayload,
  HouseRevokeInvitePayload,
  HouseReducer,
  HouseUnbanMemberPayload,
  HouseUpdatePayload,
  DmDeletePayload,
  DmEditPayload,
  BadgeGrantPayload,
  BadgePayload,
  BadgeReducer,
  BadgeRevokePayload,
  DmPayload,
  DmReducer,
  DmSendPayload,
  VoiceJoinPayload,
  VoiceLeavePayload,
  VoicePayload,
  VoiceReducer,
  VoiceUpdateMediaStatePayload,
  MessageAttachmentPayload,
  MessageDeletePayload,
  MessageEditPayload,
  MessagePayload,
  MessageReactionPayload,
  MessageReducer,
  MessageSendPayload,
  RoleAssignPayload,
  RoleCreatePayload,
  RoleDeletePayload,
  RolePayload,
  RoleReducer,
  RoleRevokePayload,
  RoleUpdatePayload,
  PresenceStatus,
  RoomCreatePayload,
  RoomDeletePayload,
  RoomPayload,
  RoomSetPermissionOverridePayload,
  RoomReducer,
  RoomUpdatePayload,
  UserProfilePayload,
  UserReducer,
  UserStatusPayload
};

export type ReducerResult = {
  ok: true;
  reducer: string;
  placeholder: false;
  timestamp: string;
};

export const SPACETIME_USERNAME_STORAGE_KEY = "houseplan.spacetime.username";

function getClient() {
  return getSpacetimeClient({
    url: process.env.NEXT_PUBLIC_SPACETIME_URL ?? "ws://localhost:3000",
    moduleName: process.env.NEXT_PUBLIC_SPACETIME_MODULE ?? "houseplan",
    tokenStorageKey: SPACETIME_TOKEN_STORAGE_KEY
  });
}

export function hasSessionToken(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(SPACETIME_TOKEN_STORAGE_KEY));
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SPACETIME_TOKEN_STORAGE_KEY);
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SPACETIME_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SPACETIME_USERNAME_STORAGE_KEY);
}

export function getCurrentUsername(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SPACETIME_USERNAME_STORAGE_KEY);
}

export function clearCurrentUsername(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SPACETIME_USERNAME_STORAGE_KEY);
}

function rememberCurrentUsername(username?: string) {
  if (typeof window === "undefined") return;
  if (!username) return;
  window.localStorage.setItem(SPACETIME_USERNAME_STORAGE_KEY, username);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

export function isSessionError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes("Not authenticated.") ||
    message.includes("Session expired.") ||
    message.includes("Session not found.") ||
    message.includes("Session is invalid or expired.")
  );
}

export async function invokeAuthReducer(
  reducer: AuthReducer,
  payload?: AuthPayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callAuthReducer(reducer, payload);
  if ((reducer === "auth.login" || reducer === "auth.register") && payload?.username) {
    rememberCurrentUsername(payload.username);
  }

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeUserReducer(
  reducer: UserReducer,
  payload: UserProfilePayload | UserStatusPayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callUserReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeHouseReducer(
  reducer: HouseReducer,
  payload: HousePayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callHouseReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeRoomReducer(
  reducer: RoomReducer,
  payload: RoomPayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callRoomReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeMessageReducer(
  reducer: MessageReducer,
  payload: MessagePayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callMessageReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeDmReducer(
  reducer: DmReducer,
  payload: DmPayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callDmReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeVoiceReducer(
  reducer: VoiceReducer,
  payload?: VoicePayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callVoiceReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeRoleReducer(
  reducer: RoleReducer,
  payload: RolePayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callRoleReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function invokeBadgeReducer(
  reducer: BadgeReducer,
  payload: BadgePayload
): Promise<ReducerResult> {
  const client = getClient();
  await client.callBadgeReducer(reducer, payload);

  return {
    ok: true,
    reducer,
    placeholder: false,
    timestamp: new Date().toISOString()
  };
}

export async function listUsers() {
  const client = getClient();
  return client.listUsers();
}

export async function listPresence() {
  const client = getClient();
  return client.listPresence();
}

export async function listHouses() {
  const client = getClient();
  return client.listHouses();
}

export async function listHouseMembers() {
  const client = getClient();
  return client.listHouseMembers();
}

export async function listInvites() {
  const client = getClient();
  return client.listInvites();
}

export async function listRooms() {
  const client = getClient();
  return client.listRooms();
}

export async function listRoles() {
  const client = getClient();
  return client.listRoles();
}

export async function listMemberRoles() {
  const client = getClient();
  return client.listMemberRoles();
}

export async function listRoomPermissionOverrides() {
  const client = getClient();
  return client.listRoomPermissionOverrides();
}

export async function listMessages() {
  const client = getClient();
  return client.listMessages();
}

export async function listAttachments() {
  const client = getClient();
  return client.listAttachments();
}

export async function listReactions() {
  const client = getClient();
  return client.listReactions();
}

export async function listDmMessages() {
  const client = getClient();
  return client.listDmMessages();
}

export async function listVoiceStates() {
  const client = getClient();
  return client.listVoiceStates();
}

export async function listBadges() {
  const client = getClient();
  return client.listBadges();
}

export async function listUserBadges() {
  const client = getClient();
  return client.listUserBadges();
}

export async function invokeLogoutReducer(): Promise<void> {
  const client = getClient();
  await client.callAuthReducer("auth.logout");
  clearCurrentUsername();
}

export async function assertSession(): Promise<void> {
  const client = getClient();
  await client.callAuthReducer("auth.assertSession");
}

export async function ensureSpacetimeConnection() {
  const client = getClient();
  return client.connect();
}

export function getActiveSpacetimeConnection() {
  const client = getClient();
  return client.getConnection();
}
