export interface Emote {
  name: string;
  file: string;
  label: string;
}

export const EMOTES: Emote[] = [
  { name: "joint_smile", file: "joint_smile.jpg", label: "Joint Smile" },
  { name: "weed_sunglasses", file: "weed_sunglasses.jpg", label: "Weed Sunglasses" },
  { name: "trippy_eyes", file: "trippy_eyes.jpg", label: "Trippy Eyes" },
  { name: "sleepy_beanie", file: "sleepy_beanie.jpg", label: "Sleepy Beanie" },
  { name: "happy_cloud", file: "happy_cloud.jpg", label: "Happy Cloud" },
  { name: "blazing_joint", file: "blazing_joint.jpg", label: "Blazing Joint" },
  { name: "munchies_face", file: "munchies_face.jpg", label: "Munchies Face" },
  { name: "peace_leaf", file: "peace_leaf.jpg", label: "Peace Leaf" },
  { name: "chill_cloud", file: "chill_cloud.jpg", label: "Chill Cloud" },
  { name: "high_five", file: "high_five.jpg", label: "High Five" },
  { name: "sleepy_puff", file: "sleepy_puff.jpg", label: "Sleepy Puff" },
  { name: "trippy_bud", file: "trippy_bud.jpg", label: "Trippy Bud" },
  { name: "happy_herb", file: "happy_herb.jpg", label: "Happy Herb" },
  { name: "sunglass_joint", file: "sunglass_joint.jpg", label: "Sunglass Joint" },
  { name: "cloud_nine", file: "cloud_nine.jpg", label: "Cloud Nine" },
  { name: "green_glow", file: "green_glow.jpg", label: "Green Glow" },
  { name: "puff_master", file: "puff_master.jpg", label: "Puff Master" },
  { name: "zen_bud", file: "zen_bud.jpg", label: "Zen Bud" },
  { name: "laugh_leaf", file: "laugh_leaf.jpg", label: "Laugh Leaf" },
  { name: "vibe_vape", file: "vibe_vape.jpg", label: "Vibe Vape" },
  { name: "couch_lock", file: "couch_lock.jpg", label: "Couch Lock" },
  { name: "giggly_greens", file: "giggly_greens.jpg", label: "Giggly Greens" },
  { name: "fire_bud", file: "fire_bud.jpg", label: "Fire Bud" },
  { name: "cosmic_canna", file: "cosmic_canna.jpg", label: "Cosmic Canna" },
  { name: "mellow_mood", file: "mellow_mood.jpg", label: "Mellow Mood" },
];

export const EMOTE_MAP = Object.fromEntries(EMOTES.map(e => [e.name, e]));
