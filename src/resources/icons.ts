import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError, CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

const GITHUB_RAW = "https://raw.githubusercontent.com/google/material-design-icons/master/symbols/android";

const STYLES = ["outlined", "rounded", "sharp"] as const;
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700] as const;

interface IconInfo {
  name: string;
  styles: string[];
  fill: boolean;
}

import { ICON_NAMES } from "./icon-names.js";

async function fetchSvg(icon: string, style: string, fill: boolean): Promise<string> {
  const suffix = fill ? "-fill" : "";
  const url = `${SVG_BASE}/${style}/${icon}${suffix}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new CliError(1, `Failed to fetch SVG: ${res.statusText} (${url})`);
  return res.text();
}

async function fetchAndroidXml(icon: string, style: string, fill: boolean, size: number): Promise<string> {
  const styleMap: Record<string, string> = {
    outlined: "materialsymbolsoutlined",
    rounded: "materialsymbolsrounded",
    sharp: "materialsymbolssharp",
  };
  const fillSuffix = fill ? "_fill1" : "";
  const url = `${GITHUB_RAW}/${icon}/${styleMap[style]}/${icon}${fillSuffix}_${size}px.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new CliError(1, `Failed to fetch Android XML: ${res.statusText} (${url})`);
  return res.text();
}

export const iconsResource = new Command("icons")
  .description("Search, get info, and download Material Symbols icons");

iconsResource
  .command("list")
  .description("List available icon names, optionally filtered by search query")
  .option("--search <query>", "Filter icons by name (case-insensitive partial match)")
  .option("--limit <n>", "Max results", "50")
  .option("--fields <cols>", "Comma-separated columns to display", "name")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons list",
    "  material-symbols-cli icons list --search home",
    "  material-symbols-cli icons list --search arrow --limit 10 --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      let filtered: string[];
      if (opts.search) {
        const q = opts.search.toLowerCase();
        filtered = ICON_NAMES.filter((n) => n.includes(q));
      } else {
        filtered = ICON_NAMES;
      }

      const limit = parseInt(opts.limit, 10);
      const results = filtered.slice(0, limit).map((name) => ({
        name,
        styles: STYLES.join(", "),
        fill: "yes",
      }));

      const fields = opts.fields?.split(",");
      output(results, { json: opts.json, format: opts.format, fields });
      if (!opts.json) {
        log.info(`\n${filtered.length} icons matched (showing ${results.length})`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("search")
  .description("Search icons by keyword with more details")
  .argument("<query>", "Search keyword to match icon names")
  .option("--limit <n>", "Max results", "30")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons search home",
    "  material-symbols-cli icons search arrow_back --json",
    "  material-symbols-cli icons search settings --limit 5",
  ].join("\n"))
  .action(async (query: string, opts) => {
    try {
      const q = query.toLowerCase();
      const matched = ICON_NAMES.filter((n) => n.includes(q));
      const limit = parseInt(opts.limit, 10);
      const results = matched.slice(0, limit).map((name) => ({
        name,
        svg_url: `https://cdn.jsdelivr.net/npm/@material-symbols/svg-400/outlined/${name}.svg`,
        android_xml_url: `https://github.com/google/material-design-icons/tree/main/symbols/android/${name}/materialsymbolsoutlined`,
        styles_available: STYLES.join(", "),
        fill_available: "yes",
        codepoint_url: `https://fonts.google.com/icons?icon=${name}`,
      }));

      output(results, { json: opts.json, format: opts.format });
      if (!opts.json) {
        log.info(`\n${matched.length} icons matched "${query}" (showing ${results.length})`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("get")
  .description("Get detailed info about a specific icon")
  .argument("<name>", "Icon name (e.g. search, home, settings)")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons get search",
    "  material-symbols-cli icons get home --json",
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = name.toLowerCase().replace(/\s+/g, "_");
      const styles = ["outlined", "rounded", "sharp"];
      const info: Record<string, unknown> = {
        name,
        styles: styles.join(", "),
        fill_supported: "yes",
        weights: WEIGHTS.join(", "),
        svg_url_outlined: `https://cdn.jsdelivr.net/npm/@material-symbols/svg-400/outlined/${name}.svg`,
        svg_url_outlined_fill: `https://cdn.jsdelivr.net/npm/@material-symbols/svg-400/outlined/${name}-fill.svg`,
        svg_url_rounded: `https://cdn.jsdelivr.net/npm/@material-symbols/svg-400/rounded/${name}.svg`,
        svg_url_sharp: `https://cdn.jsdelivr.net/npm/@material-symbols/svg-400/sharp/${name}.svg`,
        android_xml_dir: `https://github.com/google/material-design-icons/tree/main/symbols/android/${name}/materialsymbolsoutlined`,
        browse_url: `https://fonts.google.com/icons?icon=${name}`,
      };

      output(info, { json: opts.json, format: opts.format });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("download")
  .description("Download an icon SVG to a local file")
  .argument("<name>", "Icon name (e.g. search, home, settings)")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant (default: false)", false)
  .option("--weight <n>", "Icon weight: 100-700", "400")
  .option("--output <path>", "Output file path (default: <name>_<style>.svg)")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    '  material-symbols-cli icons download search',
    '  material-symbols-cli icons download home --style rounded',
    '  material-symbols-cli icons download settings --fill --output my_icon.svg',
    '  material-symbols-cli icons download favorite --style sharp --fill',
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = name.toLowerCase().replace(/\s+/g, "_");
      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const weight = opts.weight || "400";

      if (!STYLES.includes(style as typeof STYLES[number])) {
        throw new CliError(2, `Invalid style "${style}". Must be one of: ${STYLES.join(", ")}`);
      }

      const svgBase = weight === "400"
        ? "https://cdn.jsdelivr.net/npm/@material-symbols/svg-400"
        : `https://cdn.jsdelivr.net/npm/@material-symbols/svg-${weight}`;
      const suffix = fill ? "-fill" : "";
      const url = `${svgBase}/${style}/${name}${suffix}.svg`;

      log.debug(`Fetching: ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new CliError(1, `Icon "${name}" not found with style "${style}"`);

      const svg = await res.text();
      const outputPath = opts.output || `${name}_${style}${fill ? "_fill" : ""}.svg`;
      const fullPath = resolve(outputPath);

      mkdirSync(fullPath.replace(/\/[^/]+$/, ""), { recursive: true });
      writeFileSync(fullPath, svg);

      const result = {
        icon: name,
        style,
        fill: fill ? "yes" : "no",
        weight,
        file: fullPath,
        size_bytes: svg.length,
        url,
      };

      output(result, { json: opts.json });
      if (!opts.json) {
        log.success(`Downloaded "${name}" (${style}) to ${fullPath}`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("styles")
  .description("List available icon styles")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons styles",
    "  material-symbols-cli icons styles --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const data = STYLES.map((s) => ({
        style: s,
        description: s === "outlined" ? "Default outlined style" : s === "rounded" ? "Rounded corners style" : "Sharp corners style",
        fill_supported: "yes",
      }));
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("weights")
  .description("List available icon weights (stroke thickness)")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons weights",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const data = WEIGHTS.map((w) => ({
        weight: w,
        description: w === 100 ? "Thin" : w === 200 ? "Extra Light" : w === 300 ? "Light" : w === 400 ? "Regular (default)" : w === 500 ? "Medium" : w === 600 ? "Semi Bold" : "Bold",
        npm_package: `@material-symbols/svg-${w}`,
      }));
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
