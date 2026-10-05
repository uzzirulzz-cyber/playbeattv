// Genre + language detection. Heuristic, no external services.

export const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Romance", "Thriller",
  "Horror", "Crime", "Mystery", "Sci-Fi", "Fantasy", "Family",
  "Kids", "Animation", "Documentary", "History", "Educational",
  "Classic Cinema", "Short Films", "Indie", "Web Series",
] as const

export type Genre = typeof GENRES[number]

const GENRE_PATTERNS: { genre: Genre; re: RegExp }[] = [
  { genre: "Action",      re: /\b(action|fight|combat|war|battle|explosion|gunfight|shootout|stunt)\b/i },
  { genre: "Adventure",   re: /\b(adventure|journey|quest|expedition|treasure|explore)\b/i },
  { genre: "Comedy",       re: /\b(comedy|comedian|funny|humor|laugh|sitcom|parody|slapstick)\b/i },
  { genre: "Drama",       re: /\b(drama|dramatic|family\s+drama|melodrama|emotional)\b/i },
  { genre: "Romance",     re: /\b(romance|romantic|love\s+story|relationships?)\b/i },
  { genre: "Thriller",    re: /\b(thriller|suspense|tension|psychological)\b/i },
  { genre: "Horror",      re: /\b(horror|scary|terror|ghost|haunt|monster|zombie|vampire|slasher)\b/i },
  { genre: "Crime",       re: /\b(crime|gangster|mob|detective|police|noir|heist)\b/i },
  { genre: "Mystery",     re: /\b(mystery|whodunit|puzzle|investigation)\b/i },
  { genre: "Sci-Fi",      re: /\b(science\s+fiction|sci-?fi|space|alien|robot|cyber|future|dystopia|spaceship)\b/i },
  { genre: "Fantasy",     re: /\b(fantasy|magic|wizard|dragon|elf|mythical|sorcery)\b/i },
  { genre: "Family",      re: /\b(family|all\s+ages|wholesome)\b/i },
  { genre: "Kids",        re: /\b(kids|children|kid|child|cartoon\s+for\s+kids|toddler)\b/i },
  { genre: "Animation",   re: /\b(animat(?:ed|ion)|cartoon|cgi|stop-?motion|anime)\b/i },
  { genre: "Documentary", re: /\b(documentary|docu-?drama|non-?fiction|history\s+of|biograph)\b/i },
  { genre: "History",     re: /\b(history|historical|ancient|medieval|world\s+war|civil\s+war)\b/i },
  { genre: "Educational", re: /\b(educational|tutorial|lecture|lesson|course|learn|teaching|classroom)\b/i },
  { genre: "Classic Cinema", re: /\b(classic\s+cinema|classic\s+film|silent\s+film|film\s+noir|golden\s+age)\b/i },
  { genre: "Short Films",  re: /\bshort\s+(film|movie|animation)\b/i },
  { genre: "Indie",       re: /\b(indie|independent\s+(film|cinema))\b/i },
  { genre: "Web Series",  re: /\b(web\s+series|web\s+show|mini\s+series|webisode)\b/i },
]

export function detectGenres(opts: {
  title: string
  description?: string
  tags?: string[]
  sourceCategory?: string
}): Genre[] {
  const text = `${opts.title}\n${opts.description || ""}\n${(opts.tags || []).join(" ")}\n${opts.sourceCategory || ""}`
  const found = new Set<Genre>()
  for (const { genre, re } of GENRE_PATTERNS) {
    if (re.test(text)) found.add(genre)
  }
  if (found.size === 0) return ["Other" as Genre]
  return Array.from(found)
}

// =========================================================
// LANGUAGE DETECTION
// =========================================================

export const LANGUAGES = [
  "English", "Urdu", "Hindi", "Arabic", "Turkish", "Korean",
  "Spanish", "French", "Japanese", "Other",
] as const
export type Language = typeof LANGUAGES[number]

const LANGUAGE_HINTS: Record<string, RegExp> = {
  English:  /\b(english|eng|en)\b/i,
  Urdu:     /\b(urdu|ur|اردو)\b/i,
  Hindi:    /\b(hindi|hi|हिंदी|हिन्दी)\b/i,
  Arabic:   /\b(arabic|ar|عربي|العربية)\b/i,
  Turkish:  /\b(turkish|tr|türkçe|turkce)\b/i,
  Korean:   /\b(korean|ko|한국어|한국)\b/i,
  Spanish:  /\b(spanish|es|español|espanol)\b/i,
  French:   /\b(french|fr|français|francais)\b/i,
  Japanese: /\b(japanese|ja|日本語|日本)\b/i,
}

export function detectLanguage(opts: {
  metadataLanguage?: string  // e.g. "en" / "en-US" / "hi" from YouTube
  title?: string
  description?: string
  tags?: string[]
}): Language[] {
  const langs = new Set<Language>()

  // 1. Trust metadata first
  if (opts.metadataLanguage) {
    const code = opts.metadataLanguage.split("-")[0].toLowerCase()
    const map: Record<string, Language> = {
      en: "English", ur: "Urdu", hi: "Hindi", ar: "Arabic",
      tr: "Turkish", ko: "Korean", es: "Spanish",
      fr: "French", ja: "Japanese",
    }
    if (map[code]) langs.add(map[code])
  }

  // 2. Hint scan
  const text = `${opts.title || ""}\n${opts.description || ""}\n${(opts.tags || []).join(" ")}`
  for (const [lang, re] of Object.entries(LANGUAGE_HINTS)) {
    if (re.test(text)) {
      langs.add(lang as Language)
    }
  }

  if (langs.size === 0) return ["Other"]
  return Array.from(langs)
}

// =========================================================
// CONTENT TYPE CLASSIFICATION
// =========================================================

export type ContentType = "movie" | "series" | "episode" | "documentary" | "short" | "animation" | "other"

export function classifyType(opts: {
  title: string
  description?: string
  duration?: number | null
  isEpisode?: boolean
  tags?: string[]
}): ContentType {
  const text = `${opts.title}\n${opts.description || ""}\n${(opts.tags || []).join(" ")}`

  if (opts.isEpisode) return "episode"
  if (/\bshort\s*(film|movie|animation)?\b/i.test(text)) return "short"
  if (/\banimat(?:ed|ion)\b/i.test(text)) return "animation"
  if (/\b(documentary|docu-?drama|non-?fiction|biography)\b/i.test(text)) return "documentary"
  if (/\b(web\s+series|web\s+show|mini\s+series|webisode)\b/i.test(text)) return "series"

  // Movie duration heuristic
  if (opts.duration && opts.duration >= 40 * 60) return "movie"
  if (/\b(full\s+movie|full\s+film|film|movie)\b/i.test(text)) return "movie"

  return "other"
}
