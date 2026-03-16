export const DM_EMOJI_PRESETS = [
  "❤️",
  "😂",
  "😭",
  "🔥",
  "✨",
  "👀",
  "👍",
  "🙏",
  "🎉",
  "😎",
  "🤝",
  "🥹"
] as const;

export const DM_GIF_PRESETS = [
  {
    id: "celebrate",
    label: "Celebrate",
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzl0eTk4dHBsdjQyZW8ybjVqejRwdjNiMDE4dTcxbHN6d3VjaWRkNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3V0lsGtTMSB5YNgc/giphy.gif"
  },
  {
    id: "lol",
    label: "Laugh",
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDAxeGllM2NwdHAwMTJpcWQzNXQ1ZnlydWg0YzlpN25oMzB1dWxjaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/10JhviFuU2gWD6/giphy.gif"
  },
  {
    id: "wow",
    label: "Wow",
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjA0MTlrN3g0MDhpbDJkcGZrN3F4bW9qcHBocXdtd2I3c3FoeTc0diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEduOnl5IHM5NRodO/giphy.gif"
  },
  {
    id: "ok",
    label: "Approved",
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2l2bjM1dmg5a2djZTdhcTFsYXZnMzNnaDRmbnZiZDRmOXgydm55dCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/111ebonMs90YLu/giphy.gif"
  },
  {
    id: "dance",
    label: "Dance",
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHM4bHVzeTFjMXI4cWVtYjJ0dHR4eWdrcTlxcDkwajhpbDF0ZG14NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5xaOcLGvzHxDKjufnLW/giphy.gif"
  },
  {
    id: "typing",
    label: "Typing",
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWE3eW94dnF0MmQ0ZHY0ZGd4ejBlZWV5M2c5NXZ5eWI0MTRqNjBiZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgG50Fb7Mi0prBC/giphy.gif"
  }
] as const;

export type DmEmojiCategoryId =
  | "smileys"
  | "people"
  | "nature"
  | "food"
  | "activities"
  | "travel"
  | "objects"
  | "symbols";

export type DmEmojiEntry = {
  emoji: string;
  label: string;
  keywords: string[];
  category: DmEmojiCategoryId;
};

export const DM_EMOJI_CATEGORIES: Array<{ id: DmEmojiCategoryId; label: string; icon: string }> = [
  { id: "smileys", label: "Smileys", icon: "😀" },
  { id: "people", label: "People", icon: "🙌" },
  { id: "nature", label: "Nature", icon: "🌿" },
  { id: "food", label: "Food", icon: "🍕" },
  { id: "activities", label: "Activities", icon: "⚽" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "objects", label: "Objects", icon: "💡" },
  { id: "symbols", label: "Symbols", icon: "❤️" }
];

export const DM_EMOJI_LIBRARY: DmEmojiEntry[] = [
  { emoji: "😀", label: "grinning face", keywords: ["happy", "smile", "joy"], category: "smileys" },
  { emoji: "😃", label: "grinning face with big eyes", keywords: ["smile", "joy"], category: "smileys" },
  { emoji: "😄", label: "grinning face with smiling eyes", keywords: ["smile", "laugh"], category: "smileys" },
  { emoji: "😁", label: "beaming face", keywords: ["cheese", "grin"], category: "smileys" },
  { emoji: "😆", label: "grinning squinting face", keywords: ["laugh", "haha"], category: "smileys" },
  { emoji: "😅", label: "grinning face with sweat", keywords: ["relief", "whew"], category: "smileys" },
  { emoji: "😂", label: "face with tears of joy", keywords: ["lol", "laugh", "funny"], category: "smileys" },
  { emoji: "🤣", label: "rolling on the floor laughing", keywords: ["rofl", "funny"], category: "smileys" },
  { emoji: "😊", label: "smiling face with smiling eyes", keywords: ["warm", "blush"], category: "smileys" },
  { emoji: "😇", label: "smiling face with halo", keywords: ["angel", "innocent"], category: "smileys" },
  { emoji: "🙂", label: "slightly smiling face", keywords: ["nice"], category: "smileys" },
  { emoji: "😉", label: "winking face", keywords: ["flirt", "wink"], category: "smileys" },
  { emoji: "😍", label: "smiling face with heart eyes", keywords: ["love", "heart"], category: "smileys" },
  { emoji: "😘", label: "face blowing a kiss", keywords: ["love", "kiss"], category: "smileys" },
  { emoji: "😋", label: "face savoring food", keywords: ["yum", "delicious"], category: "smileys" },
  { emoji: "😎", label: "smiling face with sunglasses", keywords: ["cool"], category: "smileys" },
  { emoji: "🤩", label: "star struck", keywords: ["amazed", "wow"], category: "smileys" },
  { emoji: "🥳", label: "partying face", keywords: ["celebrate", "birthday"], category: "smileys" },
  { emoji: "😏", label: "smirking face", keywords: ["hmm", "smirk"], category: "smileys" },
  { emoji: "😴", label: "sleeping face", keywords: ["tired", "sleep"], category: "smileys" },
  { emoji: "😭", label: "loudly crying face", keywords: ["sad", "cry"], category: "smileys" },
  { emoji: "😡", label: "pouting face", keywords: ["mad", "angry"], category: "smileys" },
  { emoji: "🤯", label: "exploding head", keywords: ["mind blown", "wow"], category: "smileys" },
  { emoji: "🤔", label: "thinking face", keywords: ["hmm", "think"], category: "smileys" },
  { emoji: "🤗", label: "hugging face", keywords: ["hug", "support"], category: "smileys" },
  { emoji: "🫡", label: "saluting face", keywords: ["respect", "yes sir"], category: "smileys" },
  { emoji: "🥹", label: "face holding back tears", keywords: ["moved", "tears"], category: "smileys" },
  { emoji: "👋", label: "waving hand", keywords: ["hello", "bye"], category: "people" },
  { emoji: "🤚", label: "raised back of hand", keywords: ["stop", "hand"], category: "people" },
  { emoji: "🫶", label: "heart hands", keywords: ["love", "support"], category: "people" },
  { emoji: "👏", label: "clapping hands", keywords: ["applause", "nice"], category: "people" },
  { emoji: "🙌", label: "raising hands", keywords: ["celebrate", "praise"], category: "people" },
  { emoji: "🙏", label: "folded hands", keywords: ["please", "thanks", "pray"], category: "people" },
  { emoji: "👍", label: "thumbs up", keywords: ["approve", "yes"], category: "people" },
  { emoji: "👎", label: "thumbs down", keywords: ["no", "dislike"], category: "people" },
  { emoji: "👌", label: "ok hand", keywords: ["okay"], category: "people" },
  { emoji: "✌️", label: "victory hand", keywords: ["peace"], category: "people" },
  { emoji: "🤝", label: "handshake", keywords: ["deal", "agreement"], category: "people" },
  { emoji: "💪", label: "flexed biceps", keywords: ["strong", "gym"], category: "people" },
  { emoji: "🫵", label: "index pointing at viewer", keywords: ["you"], category: "people" },
  { emoji: "🧠", label: "brain", keywords: ["smart", "idea"], category: "people" },
  { emoji: "🫂", label: "people hugging", keywords: ["comfort", "hug"], category: "people" },
  { emoji: "🐶", label: "dog face", keywords: ["pet", "puppy"], category: "nature" },
  { emoji: "🐱", label: "cat face", keywords: ["pet", "kitty"], category: "nature" },
  { emoji: "🐼", label: "panda", keywords: ["animal"], category: "nature" },
  { emoji: "🦊", label: "fox", keywords: ["animal"], category: "nature" },
  { emoji: "🦁", label: "lion", keywords: ["animal"], category: "nature" },
  { emoji: "🐸", label: "frog", keywords: ["animal"], category: "nature" },
  { emoji: "🐧", label: "penguin", keywords: ["animal"], category: "nature" },
  { emoji: "🐢", label: "turtle", keywords: ["animal"], category: "nature" },
  { emoji: "🐳", label: "spouting whale", keywords: ["ocean"], category: "nature" },
  { emoji: "🦋", label: "butterfly", keywords: ["insect"], category: "nature" },
  { emoji: "🌸", label: "cherry blossom", keywords: ["flower", "pink"], category: "nature" },
  { emoji: "🌹", label: "rose", keywords: ["flower", "love"], category: "nature" },
  { emoji: "🌵", label: "cactus", keywords: ["plant", "desert"], category: "nature" },
  { emoji: "🌿", label: "herb", keywords: ["leaf", "green"], category: "nature" },
  { emoji: "🍀", label: "four leaf clover", keywords: ["luck"], category: "nature" },
  { emoji: "🌙", label: "crescent moon", keywords: ["night"], category: "nature" },
  { emoji: "⭐", label: "star", keywords: ["night", "favorite"], category: "nature" },
  { emoji: "⚡", label: "high voltage", keywords: ["energy", "fast"], category: "nature" },
  { emoji: "🔥", label: "fire", keywords: ["lit", "hot"], category: "nature" },
  { emoji: "❄️", label: "snowflake", keywords: ["cold", "winter"], category: "nature" },
  { emoji: "☔", label: "umbrella with rain drops", keywords: ["weather", "rain"], category: "nature" },
  { emoji: "🍕", label: "pizza", keywords: ["food", "slice"], category: "food" },
  { emoji: "🍔", label: "hamburger", keywords: ["food", "burger"], category: "food" },
  { emoji: "🍟", label: "french fries", keywords: ["food", "snack"], category: "food" },
  { emoji: "🌮", label: "taco", keywords: ["food"], category: "food" },
  { emoji: "🍣", label: "sushi", keywords: ["food"], category: "food" },
  { emoji: "🍩", label: "doughnut", keywords: ["dessert", "sweet"], category: "food" },
  { emoji: "🍪", label: "cookie", keywords: ["dessert"], category: "food" },
  { emoji: "🎂", label: "birthday cake", keywords: ["cake", "party"], category: "food" },
  { emoji: "🍓", label: "strawberry", keywords: ["fruit"], category: "food" },
  { emoji: "🍉", label: "watermelon", keywords: ["fruit"], category: "food" },
  { emoji: "🍜", label: "steaming bowl", keywords: ["ramen", "noodles"], category: "food" },
  { emoji: "☕", label: "hot beverage", keywords: ["coffee", "tea"], category: "food" },
  { emoji: "🧋", label: "bubble tea", keywords: ["drink"], category: "food" },
  { emoji: "🍹", label: "tropical drink", keywords: ["drink"], category: "food" },
  { emoji: "⚽", label: "soccer ball", keywords: ["sport", "football"], category: "activities" },
  { emoji: "🏀", label: "basketball", keywords: ["sport"], category: "activities" },
  { emoji: "🏈", label: "american football", keywords: ["sport"], category: "activities" },
  { emoji: "⚾", label: "baseball", keywords: ["sport"], category: "activities" },
  { emoji: "🎮", label: "video game", keywords: ["gaming", "controller"], category: "activities" },
  { emoji: "🕹️", label: "joystick", keywords: ["arcade", "game"], category: "activities" },
  { emoji: "🎯", label: "direct hit", keywords: ["goal", "target"], category: "activities" },
  { emoji: "🎲", label: "game die", keywords: ["dice"], category: "activities" },
  { emoji: "🎸", label: "guitar", keywords: ["music"], category: "activities" },
  { emoji: "🎤", label: "microphone", keywords: ["sing", "karaoke"], category: "activities" },
  { emoji: "🎧", label: "headphone", keywords: ["music", "listen"], category: "activities" },
  { emoji: "🎬", label: "clapper board", keywords: ["movie", "film"], category: "activities" },
  { emoji: "🏆", label: "trophy", keywords: ["win", "award"], category: "activities" },
  { emoji: "🥇", label: "first place medal", keywords: ["gold", "winner"], category: "activities" },
  { emoji: "🚗", label: "automobile", keywords: ["car"], category: "travel" },
  { emoji: "🏎️", label: "racing car", keywords: ["car", "fast"], category: "travel" },
  { emoji: "🚕", label: "taxi", keywords: ["car"], category: "travel" },
  { emoji: "🚌", label: "bus", keywords: ["transport"], category: "travel" },
  { emoji: "🚆", label: "train", keywords: ["transport"], category: "travel" },
  { emoji: "✈️", label: "airplane", keywords: ["travel", "flight"], category: "travel" },
  { emoji: "🚀", label: "rocket", keywords: ["space", "launch"], category: "travel" },
  { emoji: "🛸", label: "flying saucer", keywords: ["ufo", "space"], category: "travel" },
  { emoji: "🏝️", label: "desert island", keywords: ["vacation"], category: "travel" },
  { emoji: "🗽", label: "statue of liberty", keywords: ["travel", "city"], category: "travel" },
  { emoji: "🏠", label: "house", keywords: ["home"], category: "travel" },
  { emoji: "🌆", label: "cityscape at dusk", keywords: ["city"], category: "travel" },
  { emoji: "💡", label: "light bulb", keywords: ["idea"], category: "objects" },
  { emoji: "📱", label: "mobile phone", keywords: ["phone"], category: "objects" },
  { emoji: "💻", label: "laptop", keywords: ["computer", "work"], category: "objects" },
  { emoji: "⌚", label: "watch", keywords: ["time"], category: "objects" },
  { emoji: "📷", label: "camera", keywords: ["photo"], category: "objects" },
  { emoji: "🎁", label: "wrapped gift", keywords: ["present"], category: "objects" },
  { emoji: "💎", label: "gem stone", keywords: ["diamond"], category: "objects" },
  { emoji: "🔒", label: "locked", keywords: ["secure"], category: "objects" },
  { emoji: "🔑", label: "key", keywords: ["unlock"], category: "objects" },
  { emoji: "🪄", label: "magic wand", keywords: ["magic"], category: "objects" },
  { emoji: "🧸", label: "teddy bear", keywords: ["cute"], category: "objects" },
  { emoji: "🪩", label: "mirror ball", keywords: ["party", "dance"], category: "objects" },
  { emoji: "❤️", label: "red heart", keywords: ["love"], category: "symbols" },
  { emoji: "🩷", label: "pink heart", keywords: ["love"], category: "symbols" },
  { emoji: "🧡", label: "orange heart", keywords: ["love"], category: "symbols" },
  { emoji: "💛", label: "yellow heart", keywords: ["love"], category: "symbols" },
  { emoji: "💚", label: "green heart", keywords: ["love"], category: "symbols" },
  { emoji: "💙", label: "blue heart", keywords: ["love"], category: "symbols" },
  { emoji: "💜", label: "purple heart", keywords: ["love"], category: "symbols" },
  { emoji: "🖤", label: "black heart", keywords: ["love"], category: "symbols" },
  { emoji: "💯", label: "hundred points", keywords: ["perfect", "score"], category: "symbols" },
  { emoji: "💢", label: "anger symbol", keywords: ["mad"], category: "symbols" },
  { emoji: "💥", label: "collision", keywords: ["boom"], category: "symbols" },
  { emoji: "💫", label: "dizzy", keywords: ["sparkle"], category: "symbols" },
  { emoji: "✨", label: "sparkles", keywords: ["magic", "shine"], category: "symbols" },
  { emoji: "✅", label: "check mark button", keywords: ["ok", "yes", "done"], category: "symbols" },
  { emoji: "❌", label: "cross mark", keywords: ["no", "x"], category: "symbols" },
  { emoji: "❓", label: "question mark", keywords: ["question"], category: "symbols" },
  { emoji: "❗", label: "exclamation mark", keywords: ["alert"], category: "symbols" },
  { emoji: "♾️", label: "infinity", keywords: ["forever"], category: "symbols" },
  { emoji: "🔁", label: "repeat button", keywords: ["loop"], category: "symbols" }
];
