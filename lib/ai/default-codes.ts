/**
 * Library "default codes" sourced from scripts/Notes.txt.
 *
 * This is the deterministic / canonical source that sits alongside the
 * Pinecone-history AI prediction. A product is classified into ONE of these
 * fixed categories by KEYWORD / regex matching (no LLM call — cheap, instant,
 * deterministic). It won't always match; when it doesn't, the UI falls back to
 * the AI prediction only.
 */
export interface DefaultCodeEntry {
  id: string;
  /** Human-readable English label */
  label: string;
  /** Dutch goods description (GOEDEREN OMSCHRIJVING) */
  omschrijving: string;
  /** HS / GOEDEREN CODE */
  code: string;
  /**
   * Keywords matched against the product description (case-insensitive, word
   * boundaries). The LONGEST matching keyword across all entries wins, so more
   * specific categories (e.g. "sport shoes") beat generic ones ("shoes").
   */
  keywords: string[];
}

export const DEFAULT_CODES: DefaultCodeEntry[] = [
  { id: "men-shorts", label: "Men Shorts", omschrijving: "HEREN BROEKEN", code: "61034200", keywords: ["men shorts", "mens shorts", "heren broeken"] },
  { id: "tshirts", label: "T shirts", omschrijving: "T-HEMDEN", code: "61091000", keywords: ["t-shirt", "tshirt", "t shirt", "graphic tee", "t-hemden"] },
  { id: "women-underwear", label: "Women Underwear", omschrijving: "DAMES ONDERGOED", code: "61082100", keywords: ["women underwear", "womens underwear", "ladies underwear", "panties", "bra", "lingerie", "dames ondergoed"] },
  { id: "men-underwear", label: "Men Underwear", omschrijving: "HEREN ONDERGOED", code: "61071100", keywords: ["men underwear", "mens underwear", "boxer briefs", "boxers", "heren ondergoed"] },
  { id: "boys-underwear", label: "Boys Underwear", omschrijving: "JONGENS ONDERGOED", code: "61071100", keywords: ["boys underwear", "jongens ondergoed"] },
  { id: "girls-underwear", label: "Girls Underwear", omschrijving: "MEISJES ONDERGOED", code: "61082100", keywords: ["girls underwear", "meisjes ondergoed"] },
  { id: "baby-clothes", label: "Clothes for Baby", omschrijving: "BABY KLEDING", code: "61112000", keywords: ["baby clothes", "baby", "infant", "newborn", "onesie", "romper"] },
  { id: "boys-clothes", label: "Clothes for Boy", omschrijving: "JONGENS KLEDING", code: "61032200", keywords: ["boys clothing", "jongens kleding", "big kid boys", "boys"] },
  { id: "girls-clothes", label: "Clothes for Girls", omschrijving: "MEISJES KLEDING", code: "61042200", keywords: ["girls clothing", "meisjes kleding", "big kid girls", "girls"] },
  { id: "men-clothes", label: "Clothes for Men", omschrijving: "HEREN KLEDING", code: "61032200", keywords: ["mens clothing", "heren kleding", "mens", "men"] },
  { id: "women-clothes", label: "Clothes for Women", omschrijving: "DAMES KLEDING", code: "61042200", keywords: ["womens clothing", "dames kleding", "womens", "women", "ladies"] },
  { id: "car-cup-coaster", label: "Car Cup Coaster", omschrijving: "KOP ONDERZETTER", code: "45049090", keywords: ["cup coaster", "car coaster", "coaster", "onderzetter"] },
  { id: "sandal", label: "Sandal", omschrijving: "SANDALEN", code: "64059000", keywords: ["sandal", "sandals", "sandalen"] },
  { id: "belt", label: "Belt", omschrijving: "RIEMEN", code: "42033000", keywords: ["belt", "belts", "riem", "riemen"] },
  { id: "slippers", label: "Slippers", omschrijving: "SLOFFEN", code: "64059000", keywords: ["slipper", "slippers", "sloffen"] },
  { id: "swimsuit", label: "Swimsuit", omschrijving: "BADPAK", code: "61124100", keywords: ["swimsuit", "bathing suit", "swimwear", "bikini", "swim trunks", "badpak"] },
  { id: "socks", label: "Socks", omschrijving: "KOUSEN", code: "61159500", keywords: ["sock", "socks", "kousen"] },
  { id: "light-bulb", label: "Light Bulb", omschrijving: "GLOEILAMPEN", code: "85392900", keywords: ["light bulb", "lightbulb", "led bulb", "gloeilamp", "gloeilampen"] },
  { id: "bag", label: "Bag", omschrijving: "TASSEN", code: "42029900", keywords: ["handbag", "backpack", "tote bag", "purse", "duffel", "bag", "tassen"] },
  { id: "massage-apparaat", label: "Massage Apparaat", omschrijving: "MASSAGE APPARAAT", code: "90191000", keywords: ["massage gun", "massager", "massage apparaat", "massage"] },
  { id: "auto-parts", label: "Auto Parts", omschrijving: "AUTO DELEN", code: "87089990", keywords: ["auto parts", "car parts", "auto delen", "spare part"] },
  { id: "sport-shoes", label: "Sport Shoes", omschrijving: "SPORT SCHOENEN", code: "64041100", keywords: ["sport shoes", "sports shoes", "running shoes", "athletic shoes", "sneaker", "sneakers", "sport schoenen"] },
  { id: "women-shoes", label: "Women Shoes", omschrijving: "DAMES SCHOENEN", code: "64059000", keywords: ["women shoes", "womens shoes", "ladies shoes", "high heels", "heels", "dames schoenen"] },
  { id: "girls-shoes", label: "Girls Shoes", omschrijving: "MEISJES SCHOENEN", code: "64051000", keywords: ["girls shoes", "meisjes schoenen"] },
  { id: "shoes", label: "Shoes", omschrijving: "SCHOENEN", code: "64051000", keywords: ["shoe", "shoes", "footwear", "schoenen"] },
  { id: "toys", label: "Any kinds of Toys", omschrijving: "SPEELGOED", code: "95030000", keywords: ["toy", "toys", "plush", "speelgoed", "action figure"] },
  { id: "towels", label: "Towels", omschrijving: "KATOENEN HANDDOEKEN", code: "63029100", keywords: ["towel", "towels", "handdoek", "handdoeken"] },
  { id: "playstation-parts", label: "Playstation parts / video game", omschrijving: "VIDEOSPEL", code: "95045000", keywords: ["playstation", "ps4", "ps5", "xbox", "video game", "gamepad", "controller", "videospel"] },
  { id: "solar-lamp", label: "Solar Lamp", omschrijving: "SOLAR LAMPEN", code: "94054050", keywords: ["solar lamp", "solar light", "solar lampen"] },

  // Water bottle
  { id: "tumbler", label: "Tumbler / thermos", omschrijving: "THERMOS", code: "96170000", keywords: ["tumbler", "insulated bottle", "stainless steel bottle", "vacuum flask", "thermos"] },
  { id: "plastic-water-bottle", label: "Plastic Water Bottle", omschrijving: "PLASTIEK WATERFLESSEN", code: "39233000", keywords: ["plastic water bottle", "water bottle", "plastic bottle", "waterfles"] },

  // Lunch box
  { id: "electric-lunch-box", label: "Electric Lunch Box", omschrijving: "LUNCH BOX", code: "85167900", keywords: ["electric lunch box", "heated lunch box"] },
  { id: "lunch-box", label: "Lunch Box", omschrijving: "LUNCH BOX", code: "39231000", keywords: ["lunch box", "lunchbox", "bento box"] },

  // Wrist watch
  { id: "digital-watch", label: "Digital Watch", omschrijving: "POLSHORLOGE", code: "91021200", keywords: ["digital watch", "smartwatch", "smart watch"] },
  { id: "analog-watch", label: "Analog Watch", omschrijving: "POLSHORLOGE", code: "91021100", keywords: ["analog watch", "analogue watch", "wrist watch", "wristwatch", "watch", "polshorloge"] },

  // Necklace / jewelry
  { id: "necklace-chain", label: "Necklace Chain", omschrijving: "KETTING KETTING", code: "71132000", keywords: ["necklace chain", "chain necklace"] },
  { id: "silver-jewelry", label: "Silver jewelry", omschrijving: "JUWELEN", code: "71131900", keywords: ["silver necklace", "silver jewelry", "sterling silver"] },
  { id: "gold-jewelry", label: "Gold jewelry", omschrijving: "ONEDELE LIJFSIERADEN", code: "71129100", keywords: ["gold necklace", "gold jewelry", "14k gold", "18k gold"] },
  { id: "necklace", label: "Necklace", omschrijving: "ONEDELE LIJFSIERADEN", code: "71171910", keywords: ["necklace", "pendant", "ketting", "lijfsieraden"] },

  { id: "vacuum-parts", label: "Vacuum parts", omschrijving: "STOFZUIGERS DELEN", code: "85087090", keywords: ["vacuum part", "vacuum filter", "vacuum accessory", "stofzuiger delen"] },
  { id: "vacuum", label: "Vacuum cleaner", omschrijving: "STOFZUIGERS", code: "85081100", keywords: ["vacuum cleaner", "stick vacuum", "cordless vacuum", "vacuum", "stofzuiger"] },
  { id: "auto-light", label: "Auto Light", omschrijving: "AUTO LICHT", code: "85391010", keywords: ["auto light", "car light", "headlight", "auto licht"] },
  { id: "hair-clipper", label: "Hair clipper / trimmer", omschrijving: "TONDEUSES", code: "85101000", keywords: ["hair clipper", "hair trimmer", "beard trimmer", "clipper", "tondeuse"] },
  { id: "water-dental-flosser", label: "Water dental flosser", omschrijving: "WATER DENTAL FLOSSER", code: "85098000", keywords: ["water flosser", "dental flosser", "oral irrigator"] },
  { id: "steamer", label: "Steamer / electric cleaner", omschrijving: "STOOMREINIGER", code: "85162900", keywords: ["garment steamer", "steam cleaner", "steamer", "stoomreiniger"] },
  { id: "electric-iron", label: "Electric Iron", omschrijving: "STRIJKZERS", code: "85164000", keywords: ["electric iron", "clothes iron", "steam iron", "strijkijzer", "iron"] },
  { id: "electric-tool", label: "Electric tool", omschrijving: "ELEKTRISCHE HANDGREEDSCHAP", code: "84671900", keywords: ["power tool", "electric tool", "elektrische handgereedschap"] },
  { id: "manual-tool", label: "Manual / hand tool", omschrijving: "HANDGEREEDSCHAPPEN", code: "82055900", keywords: ["hand tool", "manual tool", "wrench", "screwdriver", "pliers", "handgereedschap"] },
  { id: "electric-knife", label: "Electric knife", omschrijving: "ELEKTRISCH MES", code: "85098000", keywords: ["electric knife", "elektrisch mes"] },
  { id: "knife", label: "Knife", omschrijving: "MES", code: "82149000", keywords: ["kitchen knife", "pocket knife", "knife", "blade"] },
  { id: "electric-toothbrush", label: "Electric toothbrush", omschrijving: "ELEKTRISCHE TANDBORSTEL", code: "85098000", keywords: ["electric toothbrush", "sonic toothbrush", "elektrische tandborstel"] },
  { id: "steel-keychain", label: "Stainless steel keychain", omschrijving: "R.V.S SLEUTELHANGERS", code: "83081000", keywords: ["keychain", "key chain", "sleutelhanger"] },
  { id: "string-lights", label: "String lights", omschrijving: "LICHT", code: "94053000", keywords: ["string lights", "fairy lights", "led strip", "string light"] },
  { id: "photo-frame-wood", label: "Photo frame (wood)", omschrijving: "FOTO LIJSTEN", code: "44140000", keywords: ["wooden photo frame", "wood photo frame", "wooden frame", "wood frame"] },
  { id: "photo-frame-plastic", label: "Photo frame (plastic)", omschrijving: "FOTO LIJSTEN", code: "39264000", keywords: ["plastic photo frame", "plastic frame", "photo frame", "picture frame"] },
  { id: "photo-frame-metal", label: "Photo frame (metal)", omschrijving: "FOTO LIJSTEN", code: "83062900", keywords: ["metal photo frame", "metal frame"] },
  { id: "storage-cloth", label: "Storage medium (cloth)", omschrijving: "BERGINGSMIDDEL", code: "63079090", keywords: ["fabric storage", "cloth storage", "storage bin cloth", "bergingsmiddel"] },
  { id: "drill-machine", label: "Drill machine", omschrijving: "BOORMACHINE", code: "84672100", keywords: ["drill machine", "cordless drill", "drill", "boormachine"] },
  { id: "inflatable", label: "Inflatable articles", omschrijving: "OPBLAASBAAR ARTIKEL", code: "40169500", keywords: ["inflatable", "pool float", "air mattress", "opblaasbaar"] },
  { id: "digital-camera", label: "Digital camera", omschrijving: "DIGITALE CAMERA", code: "85258090", keywords: ["digital camera", "action camera", "digitale camera", "camera"] },
  { id: "fan", label: "Fan", omschrijving: "VENTILATOREN", code: "84145900", keywords: ["table fan", "tower fan", "ceiling fan", "fan", "ventilator"] },
  { id: "shoerack-metal", label: "Shoe rack (metal)", omschrijving: "SCHOENENREK", code: "94032000", keywords: ["shoe rack", "shoerack", "schoenenrek"] },
  { id: "garden-hose-metal", label: "Garden hose (metal)", omschrijving: "R.V.S. TUINSLANG", code: "83071000", keywords: ["garden hose", "water hose", "hose", "tuinslang"] },
];

/**
 * IVA rules from Notes.txt — injected into the enrichment prompt so the model
 * can predict `needsIVA`.
 */
export const IVA_RULES = `IVA rules — a product NEEDS IVA if it matches any of:
- Anything that contains HEMP
- Microneedling for the face
- Tattoo needles
- API Nitrite Test Kit / any water test kit
- Anything that contains MINOXIDIL
A product does NOT need IVA when it is ordinary skincare (e.g. anti-aging / collagen / hyaluronic / vitamin C serums for the face).`;

/**
 * DTZ rules from Notes.txt — injected into the enrichment prompt so the model
 * can predict `needsDTZ`.
 */
export const DTZ_RULES = `DTZ rules — a product NEEDS DTZ if it matches any of:
- Car alarm / 2-way / keyless entry / remote engine start systems
- Smart body weight / body-fat scales (smart weighing scale)
- Cordless / stick vacuum cleaners
- Marine or car stereo / radio receivers
- Wireless / portable printers
- Voice-activated / digital voice recorders (dictaphones)
A product does NOT need DTZ when it is a headphone / headset / earphone.`;

// Pre-compile { entry, keyword, regex } pairs once, sorted so the longest
// keyword is tried first (specific categories win over generic ones).
const KEYWORD_MATCHERS: Array<{
  entry: DefaultCodeEntry;
  keyword: string;
  regex: RegExp;
}> = DEFAULT_CODES.flatMap((entry) =>
  entry.keywords.map((keyword) => ({
    entry,
    keyword,
    // Word-boundary match so "men" does not hit "women", "iron" not "environment".
    regex: new RegExp(
      `(?:^|[^a-z0-9])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`,
      "i"
    ),
  }))
).sort((a, b) => b.keyword.length - a.keyword.length);

const DEFAULT_CODES_BY_ID = new Map(DEFAULT_CODES.map((e) => [e.id, e]));

/** Resolve a category id back to its library entry (or null if unknown). */
export function getDefaultCodeById(id: string): DefaultCodeEntry | null {
  if (!id) return null;
  return DEFAULT_CODES_BY_ID.get(id.trim()) ?? null;
}

/**
 * Find ALL library categories whose keywords match the description, via
 * keyword/regex matching (no LLM, synchronous, free). Results are deduped by
 * category and ordered most-specific-first (longest matching keyword wins).
 *
 * The caller hands these candidates to the per-product enrichment model so it
 * can pick the single best fit — the regex does the deterministic "search",
 * the model does the "select". Returns an empty array when nothing matches.
 */
export function findDefaultCodeCandidates(
  description: string
): DefaultCodeEntry[] {
  if (!description || description.trim().length < 2) return [];

  const haystack = description.toLowerCase();
  const seen = new Set<string>();
  const candidates: DefaultCodeEntry[] = [];

  // KEYWORD_MATCHERS is pre-sorted longest-keyword-first, so the first time we
  // see each category it is via its most specific matching keyword.
  for (const { entry, regex } of KEYWORD_MATCHERS) {
    if (seen.has(entry.id)) continue;
    if (regex.test(haystack)) {
      seen.add(entry.id);
      candidates.push(entry);
    }
  }

  return candidates;
}
