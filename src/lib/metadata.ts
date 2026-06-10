import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { log } from "./logger.js";

const METADATA_URL = "https://fonts.google.com/metadata/icons?incomplete=1&key=material_symbols";
const CACHE_PATH = join(homedir(), ".cache", "material-symbols-cli", "metadata.json");

interface IconMeta {
  name: string;
  version?: number;
  popularity?: number;
  codepoint?: number;
  unsupported_families?: string[];
  categories: string[];
  tags?: string[];
  sizes_px?: number[];
}

interface MetadataResponse {
  icons: IconMeta[];
}

let cachedMetadata: Map<string, IconMeta> | null = null;

function stripJsonPrefix(text: string): string {
  return text.replace(/^\)\]\}'\n?/, "");
}

async function fetchMetadata(): Promise<Map<string, IconMeta>> {
  log.debug("Fetching icon metadata from Google Fonts API...");
  const res = await fetch(METADATA_URL);
  if (!res.ok) throw new Error(`Failed to fetch metadata: HTTP ${res.status}`);
  const raw = await res.text();
  const json = JSON.parse(stripJsonPrefix(raw)) as MetadataResponse;
  const map = new Map<string, IconMeta>();
  for (const icon of json.icons) {
    map.set(icon.name, icon);
  }
  return map;
}

async function saveToCache(data: Map<string, IconMeta>): Promise<void> {
  try {
    await mkdir(CACHE_PATH.replace(/\/[^/]+$/, ""), { recursive: true });
    const arr = Array.from(data.values());
    await writeFile(CACHE_PATH, JSON.stringify(arr));
  } catch {
    // non-fatal
  }
}

async function loadFromCache(): Promise<Map<string, IconMeta> | null> {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    const raw = await readFile(CACHE_PATH, "utf-8");
    const arr = JSON.parse(raw) as IconMeta[];
    return new Map(arr.map((i) => [i.name, i]));
  } catch {
    return null;
  }
}

export async function getMetadata(): Promise<Map<string, IconMeta>> {
  if (cachedMetadata) return cachedMetadata;

  const fromCache = await loadFromCache();
  if (fromCache) {
    cachedMetadata = fromCache;
    return fromCache;
  }

  const fromApi = await fetchMetadata();
  cachedMetadata = fromApi;
  saveToCache(fromApi);
  return fromApi;
}

export function getIconCategories(meta: IconMeta): string[] {
  return meta.categories || [];
}

export function getIconTags(meta: IconMeta): string[] {
  return meta.tags || [];
}

export function getIconPopularity(meta: IconMeta): number | undefined {
  return meta.popularity;
}

export function getIconCodepoint(meta: IconMeta): number | undefined {
  return meta.codepoint;
}

export function getIconSizesPx(meta: IconMeta): number[] | undefined {
  return meta.sizes_px;
}

export async function getIconMeta(name: string): Promise<IconMeta | undefined> {
  const metadata = await getMetadata();
  return metadata.get(name);
}

export const ALL_CATEGORIES = [
  "Actions", "Activities", "Android", "Audio&Video", "Business",
  "Communicate", "External", "Hardware", "Home", "Household",
  "Images", "Maps", "Privacy", "Social", "Text", "Transit", "Travel",
  "UI actions",
  "action", "alert", "av", "communication", "content", "device",
  "editor", "file", "hardware", "image", "maps", "navigation",
  "notification", "places", "search", "social", "toggle",
].sort();
