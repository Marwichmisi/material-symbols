import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError, CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { ICON_NAMES } from "./icon-names.js";
import {
  STYLES, WEIGHTS, SVG_CDN, GITHUB_ANDROID_RAW,
  normalizeIconName, validateNumericOption, isValidIconName,
  styleCapitalized, STYLE_DESCRIPTIONS, WEIGHT_DESCRIPTIONS,
} from "../lib/constants.js";
import { getMetadata, getIconMeta, getIconCategories, getIconTags, getIconPopularity, getIconCodepoint } from "../lib/metadata.js";

export const iconsResource = new Command("icons")
  .description("Search, get info, and download Material Symbols icons");

iconsResource
  .command("list")
  .description("List available icon names, optionally filtered by search query or category")
  .option("--search <query>", "Filter icons by name (case-insensitive partial match)")
  .option("--category <cat>", "Filter by category (e.g. Navigation, Action, Social, Maps)")
  .option("--limit <n>", "Max results", "50")
  .option("--offset <n>", "Number of results to skip", "0")
  .option("--fields <cols>", "Comma-separated columns to display", "name")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons list --category Navigation",
    "  material-symbols-cli icons list --search arrow --category Maps",
    "  material-symbols-cli icons list --search home --limit 10 --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      let filtered: string[];
      if (opts.search && opts.category) {
        const q = opts.search.toLowerCase();
        const cat = opts.category.toLowerCase();
        const meta = await getMetadata();
        filtered = ICON_NAMES.filter((n) => {
          const m = meta.get(n);
          return n.includes(q) && m && m.categories && m.categories.some((c: string) => c.toLowerCase() === cat);
        });
      } else if (opts.search) {
        const q = opts.search.toLowerCase();
        filtered = ICON_NAMES.filter((n) => n.includes(q));
      } else if (opts.category) {
        const cat = opts.category.toLowerCase();
        const meta = await getMetadata();
        filtered = ICON_NAMES.filter((n) => {
          const m = meta.get(n);
          return m && m.categories && m.categories.some((c: string) => c.toLowerCase() === cat);
        });
      } else {
        filtered = ICON_NAMES;
      }

      const limit = Math.max(1, parseInt(opts.limit, 10) || 50);
      const offset = Math.max(0, parseInt(opts.offset, 10) || 0);
      const results = filtered.slice(offset, offset + limit).map((name) => ({
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
  .option("--category <cat>", "Filter by category (e.g. Navigation, Action)")
  .option("--limit <n>", "Max results", "30")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons search home",
    "  material-symbols-cli icons search arrow --category Maps",
    "  material-symbols-cli icons search settings --limit 5 --json",
  ].join("\n"))
  .action(async (query: string, opts) => {
    try {
      const meta = await getMetadata();
      const q = query.toLowerCase();
      let matched: string[];

      if (opts.category) {
        const cat = opts.category.toLowerCase();
        matched = ICON_NAMES.filter((n) => {
          const m = meta.get(n);
          return n.includes(q) && m && m.categories && m.categories.some((c: string) => c.toLowerCase() === cat);
        });
      } else {
        matched = ICON_NAMES.filter((n) => n.includes(q));
      }

      const limit = Math.max(1, parseInt(opts.limit, 10) || 30);
      const results = matched.slice(0, limit).map((name) => {
        const m = meta.get(name);
        return {
          name,
          categories: m ? (m.categories || []) : [],
          tags: m ? (m.tags || []).slice(0, 5) : [],
          popularity: m ? m.popularity : undefined,
          codepoint: m ? m.codepoint : undefined,
          svg_url: `${SVG_CDN}-400/outlined/${name}.svg`,
          android_xml_url: `https://github.com/google/material-design-icons/tree/main/symbols/android/${name}/materialsymbolsoutlined`,
          styles_available: STYLES.join(", "),
        };
      });

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
      name = normalizeIconName(name);
      const meta = await getIconMeta(name);
      const info: Record<string, unknown> = {
        name,
        categories: meta ? getIconCategories(meta) : [],
        tags: meta ? getIconTags(meta).slice(0, 10) : [],
        popularity: meta ? getIconPopularity(meta) : undefined,
        codepoint: meta ? getIconCodepoint(meta) : undefined,
        codepoint_hex: meta ? `0x${getIconCodepoint(meta)!.toString(16)}` : undefined,
        styles: STYLES.join(", "),
        fill_supported: "yes",
        weights: WEIGHTS.join(", "),
        svg_url_outlined: `${SVG_CDN}-400/outlined/${name}.svg`,
        svg_url_outlined_fill: `${SVG_CDN}-400/outlined/${name}-fill.svg`,
        svg_url_rounded: `${SVG_CDN}-400/rounded/${name}.svg`,
        svg_url_sharp: `${SVG_CDN}-400/sharp/${name}.svg`,
        sizes_available: meta ? (meta.sizes_px || [20, 24, 40, 48]) : [20, 24, 40, 48],
        android_xml_dir: `${GITHUB_ANDROID_RAW}/${name}/materialsymbolsoutlined`,
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
  .option("--grade <n>", "Grade: -25, 0, 200", "0")
  .option("--opsz <n>", "Optical size: 20-48", "24")
  .option("--minify", "Minify SVG output (strip whitespace)", false)
  .option("--output <path>", "Output file path (default: <name>_<style>.svg)")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    '  material-symbols-cli icons download search',
    '  material-symbols-cli icons download home --style rounded --weight 500',
    '  material-symbols-cli icons download settings --fill --output my_icon.svg',
    '  material-symbols-cli icons download favorite --grade 200 --opsz 48 --minify',
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      if (!isValidIconName(name, ICON_NAMES)) {
        throw new CliError(2, `Icon "${name}" not found. Run "icons list" or "icons search <query>" to find valid names.`);
      }

      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const weight = validateNumericOption(opts.weight || "400", 100, 700, "weight");
      const grade = validateNumericOption(opts.grade || "0", -25, 200, "grade");
      const opsz = validateNumericOption(opts.opsz || "24", 20, 48, "optical size");

      if (!(STYLES as readonly string[]).includes(style)) {
        throw new CliError(2, `Invalid style "${style}". Must be one of: ${STYLES.join(", ")}`);
      }

      const svgBase = `${SVG_CDN}-${weight}`;
      const suffix = fill ? "-fill" : "";
      const url = `${svgBase}/${style}/${name}${suffix}.svg`;

      log.debug(`Fetching: ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new CliError(1, `Icon "${name}" not found with style "${style}" and weight ${weight}`);

      let svg = await res.text();
      if (opts.minify) {
        svg = svg.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").replace(/> </g, "><").trim();
      }

      const outputPath = opts.output || `${name}_${style}${fill ? "_fill" : ""}_w${weight}.svg`;
      const fullPath = resolve(outputPath);

      await mkdir(fullPath.replace(/\/[^/]+$/, ""), { recursive: true });
      await writeFile(fullPath, svg);

      const result = {
        icon: name,
        style,
        fill: fill ? "yes" : "no",
        weight,
        grade,
        opsz,
        minified: opts.minify ? "yes" : "no",
        file: fullPath,
        size_bytes: svg.length,
        url,
      };

      output(result, { json: opts.json });
      if (!opts.json) {
        log.success(`Downloaded "${name}" (${style}, w${weight}) to ${fullPath}`);
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
        description: STYLE_DESCRIPTIONS[s],
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
        description: WEIGHT_DESCRIPTIONS[w],
        npm_package: `@material-symbols/svg-${w}`,
      }));
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("recent")
  .description("List recently added icons (checks if name has modern patterns)")
  .option("--limit <n>", "Max results", "20")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons recent",
    "  material-symbols-cli icons recent --limit 10 --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const limit = Math.max(1, parseInt(opts.limit, 10) || 20);
      const results = ICON_NAMES.slice(-limit).reverse().map((name) => ({ name }));
      const fields = ["name"];
      output(results, { json: opts.json, format: opts.format, fields });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("batch")
  .description("Download multiple icons from a JSON config file")
  .argument("<file>", "JSON file with array of { name, style?, fill?, weight?, output? }")
  .option("--output-dir <dir>", "Default output directory", ".")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    `  echo '[{"name":"search"},{"name":"home","style":"rounded","fill":true}]' > icons.json`,
    "  material-symbols-cli icons batch icons.json",
    "  material-symbols-cli icons batch icons.json --output-dir ./svg",
  ].join("\n"))
  .action(async (file: string, opts) => {
    try {
      const { readFile } = await import("fs/promises");
      const content = await readFile(resolve(file), "utf-8");
      const icons: { name: string; style?: string; fill?: boolean; weight?: string; output?: string }[] = JSON.parse(content);
      if (!Array.isArray(icons)) throw new CliError(2, "Config file must contain a JSON array");

      const results: Record<string, unknown>[] = [];
      const errors: string[] = [];

      for (const item of icons) {
        try {
          const iconName = normalizeIconName(item.name);
          if (!isValidIconName(iconName, ICON_NAMES)) {
            errors.push(`${item.name}: icon not found`);
            continue;
          }

          const style = item.style || "outlined";
          const fill = item.fill || false;
          const weight = item.weight || "400";
          const suffix = fill ? "-fill" : "";
          const url = `${SVG_CDN}-${weight}/${style}/${iconName}${suffix}.svg`;

          const res = await fetch(url);
          if (!res.ok) { errors.push(`${item.name}: HTTP ${res.status}`); continue; }

          let svg = await res.text();
          const outPath = item.output || `${iconName}_${style}.svg`;
          const fullPath = resolve(opts.outputDir || ".", outPath);
          await mkdir(fullPath.replace(/\/[^/]+$/, ""), { recursive: true });
          await writeFile(fullPath, svg);

          results.push({ name: iconName, style, weight, fill, file: fullPath, size_bytes: svg.length });
        } catch (e) {
          errors.push(`${item.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      const data = { downloaded: results, errors: errors.length > 0 ? errors : undefined };
      output(data, { json: opts.json });
      if (!opts.json) {
        log.success(`Downloaded ${results.length} icons` + (errors.length > 0 ? ` (${errors.length} failed)` : ""));
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

iconsResource
  .command("categories")
  .description("List available icon categories with icon counts")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli icons categories",
    "  material-symbols-cli icons categories --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const meta = await getMetadata();
      const counts = new Map<string, number>();

      for (const name of ICON_NAMES) {
        const m = meta.get(name);
        if (m && m.categories) {
          for (const cat of m.categories) {
            counts.set(cat, (counts.get(cat) || 0) + 1);
          }
        }
      }

      const data = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, icon_count: count }));

      output(data, { json: opts.json, format: opts.format });
      if (!opts.json) {
        log.info(`\n${data.length} categories`);
        log.info('Use --category <name> with "icons list" or "icons search" to filter');
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });
