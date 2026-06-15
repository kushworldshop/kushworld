export interface Emote {
  name: string;
  file: string;
  label: string;
}

export const EMOTES: Emote[] = [
  { name: "joint_smile", file: "joint_smile.png", label: "Joint Smile" },
  { name: "weed_sunglasses", file: "weed_sunglasses.png", label: "Weed Sunglasses" },
  { name: "trippy_eyes", file: "trippy_eyes.png", label: "Trippy Eyes" },
  { name: "sleepy_beanie", file: "sleepy_beanie.png", label: "Sleepy Beanie" },
  { name: "happy_cloud", file: "happy_cloud.png", label: "Happy Cloud" },
  { name: "blazing_joint", file: "blazing_joint.png", label: "Blazing Joint" },
  { name: "munchies_face", file: "munchies_face.png", label: "Munchies Face" },
  { name: "peace_leaf", file: "peace_leaf.png", label: "Peace Leaf" },
  { name: "chill_cloud", file: "chill_cloud.png", label: "Chill Cloud" },
  { name: "high_five", file: "high_five.png", label: "High Five" },
  { name: "sleepy_puff", file: "sleepy_puff.png", label: "Sleepy Puff" },
  { name: "trippy_bud", file: "trippy_bud.png", label: "Trippy Bud" },
  { name: "happy_herb", file: "happy_herb.png", label: "Happy Herb" },
  { name: "sunglass_joint", file: "sunglass_joint.png", label: "Sunglass Joint" },
  { name: "cloud_nine", file: "cloud_nine.png", label: "Cloud Nine" },
  { name: "green_glow", file: "green_glow.png", label: "Green Glow" },
  { name: "puff_master", file: "puff_master.png", label: "Puff Master" },
  { name: "zen_bud", file: "zen_bud.png", label: "Zen Bud" },
  { name: "laugh_leaf", file: "laugh_leaf.png", label: "Laugh Leaf" },
  { name: "vibe_vape", file: "vibe_vape.png", label: "Vibe Vape" },
  { name: "couch_lock", file: "couch_lock.png", label: "Couch Lock" },
  { name: "giggly_greens", file: "giggly_greens.png", label: "Giggly Greens" },
  { name: "fire_bud", file: "fire_bud.png", label: "Fire Bud" },
  { name: "cosmic_canna", file: "cosmic_canna.png", label: "Cosmic Canna" },
  { name: "mellow_mood", file: "mellow_mood.png", label: "Mellow Mood" },
];

export const EMOTE_MAP = Object.fromEntries(EMOTES.map(e => [e.name, e]));
