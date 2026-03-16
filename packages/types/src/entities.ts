export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  status: "online" | "idle" | "dnd" | "offline";
};

export type Presence = {
  userId: string;
  status: "online" | "idle" | "dnd" | "offline";
  customText: string;
  lastSeen: string;
  currentHouseId: string;
  currentRoomId: string;
};

export type VoiceState = {
  userId: string;
  muted: boolean;
  cameraOn: boolean;
  updatedAt: string;
};

export type House = {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
};

export type HouseMember = {
  id: string;
  houseId: string;
  userId: string;
  joinedAt: string;
};

export type Invite = {
  code: string;
  houseId: string;
  createdBy: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  createdAt: string;
};

export type Room = {
  id: string;
  houseId: string;
  name: string;
  type: "chat" | "voice";
  description: string;
  position: number;
  slowmodeSeconds: number;
  createdAt: string;
};

export type Message = {
  id: string;
  roomId: string;
  authorId: string;
  content: string;
  editedAt: string;
  deletedAt: string;
  threadParentId: string;
  isPinned: boolean;
  createdAt: string;
};

export type Attachment = {
  id: string;
  messageId: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type Reaction = {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
};

export type Badge = {
  id: string;
  houseId: string;
  name: string;
  icon: string;
  badgeType: "earned" | "achievement" | "house";
  createdBy: string;
  createdAt: string;
};

export type UserBadge = {
  id: string;
  houseId: string;
  badgeId: string;
  userId: string;
  grantedBy: string;
  grantedAt: string;
};
