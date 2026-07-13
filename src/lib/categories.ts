// Custom meta-categories for PlayBeat TV.
// These group/filter Xtream backend categories into a curated browsing experience.

export interface CustomCategoryDef {
  slug: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // tailwind gradient classes
  patterns: string[]; // case-insensitive substrings matched against Xtream category names
}

export const CUSTOM_CATEGORIES: CustomCategoryDef[] = [
  {
    slug: "news",
    name: "News",
    icon: "Newspaper",
    color: "from-blue-500/20 to-blue-500/5",
    patterns: ["news", "actualit", "noticias", "nachrichten", "journal"],
  },
  {
    slug: "sports",
    name: "Sports",
    icon: "Trophy",
    color: "from-emerald-500/20 to-emerald-500/5",
    patterns: ["sport", "football", "soccer", "cricket", "premier", "liga", "serie a", "bundesliga", "champions", "europa", "formula", "f1", "ufc", "wwe", "nba", "nfl", "tennis", "golf", "hockey", "boxing", "espn", "bein", "dazn", "laliga", "world cup", "euro"],
  },
  {
    slug: "movies",
    name: "Movies",
    icon: "Film",
    color: "from-amber-500/20 to-amber-500/5",
    patterns: ["movie", "cinema", "film", "vod", "prime", "rakuten", "estrenos", "cine", "premium vod"],
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    icon: "Sparkles",
    color: "from-fuchsia-500/20 to-fuchsia-500/5",
    patterns: ["entertainment", "entreten", "general", "lifestyle", "reality", "show", "series", "variety"],
  },
  {
    slug: "music",
    name: "Music",
    icon: "Music",
    color: "from-purple-500/20 to-purple-500/5",
    patterns: ["music", "mtv", "vh1", "concert", "clip", "muzik", "musique"],
  },
  {
    slug: "kids",
    name: "Kids",
    icon: "Baby",
    color: "from-pink-500/20 to-pink-500/5",
    patterns: ["kid", "child", "cartoon", "disney", "nick", "junior", "ninos", "niños", "baby"],
  },
  {
    slug: "regional",
    name: "Regional",
    icon: "Globe",
    color: "from-cyan-500/20 to-cyan-500/5",
    patterns: ["regional", "local", "dom", "tdt", "terrestrial", "freeview", "province", "city"],
  },
  {
    slug: "hindi",
    name: "Hindi",
    icon: "Languages",
    color: "from-orange-500/20 to-orange-500/5",
    patterns: ["hindi", "india", "bollywood", "star plus", "sony", "zeetv", "colors", "star bharat", "andtv", "hindi"],
  },
  {
    slug: "pakistan",
    name: "Pakistan",
    icon: "Flag",
    color: "from-green-500/20 to-green-500/5",
    patterns: ["pakistan", "pak", "urdu", "geo", "ary", "hum tv", "ptv", "express", "samaa", "dawn", "bol", "khyber"],
  },
  {
    slug: "india",
    name: "India",
    icon: "Flag",
    color: "from-rose-500/20 to-rose-500/5",
    patterns: ["india", "indian", "hindi", "tamil", "telugu", "malayalam", "kannada", "punjabi", "bengali", "marathi", "gujarati", "star", "sony", "zee", "colors", "jio", "voot", "aaj tak", "india tv", "abp", "republic"],
  },
  {
    slug: "bangladesh",
    name: "Bangladesh",
    icon: "Flag",
    color: "from-teal-500/20 to-teal-500/5",
    patterns: ["bangladesh", "bangla", "bengali", "channel i", "atn", "rtv", "ekattor", "somoy", "jamuna", "ntv bangla", "maasranga"],
  },
  {
    slug: "informative",
    name: "Informative",
    icon: "Lightbulb",
    color: "from-indigo-500/20 to-indigo-500/5",
    patterns: ["documentaire", "documentary", "discover", "national geographic", "nat geo", "history", "science", "info", "knowledge", "learning"],
  },
  {
    slug: "traditional",
    name: "Traditional",
    icon: "Landmark",
    color: "from-yellow-500/20 to-yellow-500/5",
    patterns: ["traditional", "culture", "heritage", "religious", "islam", "quran", "ramadan", "spiritual", "faith", "prayer"],
  },
  {
    slug: "science",
    name: "Science",
    icon: "Atom",
    color: "from-sky-500/20 to-sky-500/5",
    patterns: ["science", "tech", "technology", "discovery", "nat geo", "space", "nature", "wild", "animal"],
  },
  {
    slug: "education",
    name: "Education",
    icon: "GraduationCap",
    color: "from-violet-500/20 to-violet-500/5",
    patterns: ["education", "educational", "learning", "teach", "academic", "study", "course"],
  },
];

export function matchCustomCategory(xtreamCategoryName: string): string | null {
  const lower = xtreamCategoryName.toLowerCase();
  for (const cat of CUSTOM_CATEGORIES) {
    if (cat.patterns.some((p) => lower.includes(p.toLowerCase()))) {
      return cat.slug;
    }
  }
  return null;
}
