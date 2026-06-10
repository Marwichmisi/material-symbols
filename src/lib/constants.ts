export const STYLES = ["outlined", "rounded", "sharp"] as const;
export type IconStyle = (typeof STYLES)[number];

export const WEIGHTS = [100, 200, 300, 400, 500, 600, 700] as const;
export type IconWeight = (typeof WEIGHTS)[number];

export const ANDROID_SIZES = [20, 24, 40, 48] as const;
export type AndroidSize = (typeof ANDROID_SIZES)[number];

export const GRADES = [-25, 0, 200] as const;
export type IconGrade = (typeof GRADES)[number];

export const STYLE_MAP: Record<string, string> = {
  outlined: "materialsymbolsoutlined",
  rounded: "materialsymbolsrounded",
  sharp: "materialsymbolssharp",
};

export const WEIGHT_DESCRIPTIONS: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular (default)",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
};

export const STYLE_DESCRIPTIONS: Record<string, string> = {
  outlined: "Default outlined style",
  rounded: "Rounded corners style",
  sharp: "Sharp corners style",
};

export const COMPOSE_STYLE_MAP: Record<string, string> = {
  outlined: "Icons.Outlined",
  rounded: "Icons.Rounded",
  sharp: "Icons.Sharp",
};

export const COMPOSE_LIBRARY_STYLE = {
  outlined: "material-symbols-outlined",
  rounded: "material-symbols-rounded",
  sharp: "material-symbols-sharp",
};

export const SVG_CDN = "https://cdn.jsdelivr.net/npm/@material-symbols/svg";
export const GITHUB_ANDROID_RAW = "https://raw.githubusercontent.com/google/material-design-icons/master/symbols/android";

export function normalizeIconName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

export function toKotlinIdentifier(name: string): string {
  const normalized = normalizeIconName(name);
  if (/^\d/.test(normalized)) {
    return "_" + normalized;
  }
  return normalized;
}

export function toPascalCase(name: string): string {
  return toKotlinIdentifier(name).split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

export function validateNumericOption(value: string, min: number, max: number, label: string): number {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) {
    throw new Error(`Invalid ${label} "${value}". Must be a number between ${min} and ${max}.`);
  }
  return n;
}

export function isValidIconName(name: string, knownNames: string[]): boolean {
  return knownNames.includes(normalizeIconName(name));
}

export function styleCapitalized(style: string): string {
  return style.charAt(0).toUpperCase() + style.slice(1);
}
