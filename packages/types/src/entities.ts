export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: "online" | "idle" | "dnd" | "offline";
};

export type House = {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  isPublic: boolean;
};

export type Room = {
  id: string;
  houseId: string;
  name: string;
  type: "chat" | "voice";
};

export type Message = {
  id: string;
  roomId: string;
  authorId: string;
  content: string;
  createdAt: string;
};
