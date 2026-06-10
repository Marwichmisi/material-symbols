import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError, CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { readFileSync } from "fs";
import { ICON_NAMES } from "./icon-names.js";
import {
  STYLES, ANDROID_SIZES, GITHUB_ANDROID_RAW, STYLE_MAP,
  normalizeIconName, isValidIconName, validateNumericOption,
} from "../lib/constants.js";

function buildAndroidUrl(name: string, style: string, fill: boolean, size: number, weight?: number): string {
  const fillSuffix = fill ? "_fill1" : "";
  const weightSuffix = weight && weight !== 400 ? `_weight${weight}` : "";
  return `${GITHUB_ANDROID_RAW}/${name}/${STYLE_MAP[style]}/${name}${fillSuffix}${weightSuffix}_${size}px.xml`;
}

export const androidResource = new Command("android")
  .description("Generate and download Android Vector Drawable XML icons");

androidResource
  .command("generate")
  .description("Generate Android Vector Drawable XML for an icon")
  .argument("<name>", "Icon name (e.g. search, home, settings)")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant", false)
  .option("--size <n>", "Icon size in dp: 20, 24, 40, 48", "24")
  .option("--weight <n>", "Icon weight: 100-700 (only 400 available on GitHub for most sizes)", "")
  .option("--output <path>", "Output file path (default: <name>_<size>dp.xml)")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli android generate search",
    "  material-symbols-cli android generate home --style rounded --size 48",
    "  material-symbols-cli android generate settings --fill --output res/drawable/ic_settings.xml",
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      if (!isValidIconName(name, ICON_NAMES)) {
        throw new CliError(2, `Icon "${name}" not found. Run "icons list" or "icons search <query>" to find valid names.`);
      }

      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const size = parseInt(opts.size, 10);

      if (isNaN(size) || !(ANDROID_SIZES as readonly number[]).includes(size)) {
        throw new CliError(2, `Invalid size "${opts.size}". Must be one of: ${ANDROID_SIZES.join(", ")}`);
      }
      if (!STYLE_MAP[style]) {
        throw new CliError(2, `Invalid style "${style}". Must be one of: ${Object.keys(STYLE_MAP).join(", ")}`);
      }

      const weight = opts.weight ? parseInt(opts.weight, 10) : undefined;
      const url = buildAndroidUrl(name, style, fill, size, weight);

      log.debug(`Fetching: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new CliError(1, `Android XML not found for icon "${name}" (${style}, ${size}dp${weight ? `, w${weight}` : ""}). Try a different style or size.`);
      }

      const xml = await res.text();
      const outputPath = opts.output || `${name}_${size}dp${weight ? `_w${weight}` : ""}.xml`;
      const fullPath = resolve(outputPath);

      await mkdir(fullPath.replace(/\/[^/]+$/, ""), { recursive: true });
      await writeFile(fullPath, xml);

      const result = {
        icon: name,
        style,
        fill: fill ? "yes" : "no",
        size_dp: size,
        weight: weight || 400,
        file: fullPath,
        size_bytes: xml.length,
        url,
      };

      output(result, { json: opts.json });
      if (!opts.json) {
        log.success(`Generated Android XML for "${name}" (${style}, ${size}dp) → ${fullPath}`);
        const drawableName = outputPath.replace(/\.xml$/, "").replace(/^.*[\\/]/, "");
        log.info("\nJetpack Compose usage:");
        log.info(`  Icon(painter = painterResource(R.drawable.${drawableName}), contentDescription = "${name}")`);
        log.info("\nXML Layout usage:");
        log.info(`  <ImageView android:src="@drawable/${drawableName}" />`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

androidResource
  .command("download")
  .description("Download all Android XML sizes for an icon into a directory")
  .argument("<name>", "Icon name")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant", false)
  .option("--weight <n>", "Icon weight: 100-700", "")
  .option("--output-dir <dir>", "Output directory", ".")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli android download search",
    "  material-symbols-cli android download home --style rounded --fill",
    '  material-symbols-cli android download settings --output-dir app/src/main/res/drawable',
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      if (!isValidIconName(name, ICON_NAMES)) {
        throw new CliError(2, `Icon "${name}" not found.`);
      }

      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const weight = opts.weight ? parseInt(opts.weight, 10) : undefined;
      const outputDir = opts.outputDir || ".";

      if (!STYLE_MAP[style]) {
        throw new CliError(2, `Invalid style "${style}". Must be one of: ${Object.keys(STYLE_MAP).join(", ")}`);
      }

      const dir = resolve(outputDir);
      await mkdir(dir, { recursive: true });

      const fetches = ANDROID_SIZES.map(async (size) => {
        const url = buildAndroidUrl(name, style, fill, size, weight);
        const res = await fetch(url);
        if (!res.ok) return null;
        const xml = await res.text();
        const filename = `${name}_${size}dp${weight ? `_w${weight}` : ""}.xml`;
        await writeFile(`${dir}/${filename}`, xml);
        return { icon: name, style, fill: fill ? "yes" : "no", size_dp: size, weight: weight || 400, file: `${dir}/${filename}`, size_bytes: xml.length };
      });

      const results = (await Promise.allSettled(fetches))
        .filter((r) => r.status === "fulfilled" && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<Record<string, unknown>>).value);

      if (results.length === 0) {
        throw new CliError(1, `No Android XML found for icon "${name}" (${style})`);
      }

      output(results, { json: opts.json });
      if (!opts.json) {
        log.success(`Downloaded ${results.length} Android XML files for "${name}" → ${dir}`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

androidResource
  .command("sizes")
  .description("List available Android icon sizes")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    try {
      const data = [...ANDROID_SIZES].map((s) => ({
        size_dp: s,
        description: `${s}dp icon`,
        xml_suffix: `_${s}px.xml`,
      }));
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

androidResource
  .command("batch")
  .description("Generate Android XML for multiple icons from a JSON config file")
  .argument("<file>", "JSON file with array of { name, style?, fill?, size? }")
  .option("--output-dir <dir>", "Default output directory", ".")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    `  echo '[{"name":"search"},{"name":"home","style":"rounded","size":48}]' > icons.json`,
    "  material-symbols-cli android batch icons.json --output-dir app/src/main/res/drawable",
  ].join("\n"))
  .action(async (file: string, opts) => {
    try {
      const content = readFileSync(resolve(file), "utf-8");
      const icons: { name: string; style?: string; fill?: boolean; size?: number }[] = JSON.parse(content);
      if (!Array.isArray(icons)) throw new CliError(2, "Config file must contain a JSON array");

      const results: Record<string, unknown>[] = [];
      const errors: string[] = [];

      for (const item of icons) {
        try {
          const iconName = normalizeIconName(item.name);
          if (!isValidIconName(iconName, ICON_NAMES)) { errors.push(`${item.name}: not found`); continue; }

          const style = item.style || "outlined";
          const fill = item.fill || false;
          const size = item.size || 24;
          const url = buildAndroidUrl(iconName, style, fill, size);

          const res = await fetch(url);
          if (!res.ok) { errors.push(`${item.name}: HTTP ${res.status}`); continue; }

          const xml = await res.text();
          const filename = `${iconName}_${size}dp.xml`;
          const dir = resolve(opts.outputDir || ".");
          await mkdir(dir, { recursive: true });
          await writeFile(`${dir}/${filename}`, xml);
          results.push({ name: iconName, style, fill, size_dp: size, file: `${dir}/${filename}`, size_bytes: xml.length });
        } catch (e) {
          errors.push(`${item.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      output({ downloaded: results, errors: errors.length > 0 ? errors : undefined }, { json: opts.json });
      if (!opts.json) log.success(`Generated ${results.length} Android XML files` + (errors.length > 0 ? ` (${errors.length} failed)` : ""));
    } catch (err) {
      handleError(err, opts.json);
    }
  });
