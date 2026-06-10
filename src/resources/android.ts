import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError, CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const GITHUB_RAW = "https://raw.githubusercontent.com/google/material-design-icons/master/symbols/android";

const STYLE_MAP: Record<string, string> = {
  outlined: "materialsymbolsoutlined",
  rounded: "materialsymbolsrounded",
  sharp: "materialsymbolssharp",
};

const ANDROID_SIZES = [20, 24, 40, 48] as const;

export const androidResource = new Command("android")
  .description("Generate and download Android Vector Drawable XML icons");

androidResource
  .command("generate")
  .description("Generate Android Vector Drawable XML for an icon")
  .argument("<name>", "Icon name (e.g. search, home, settings)")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant", false)
  .option("--size <n>", "Icon size in dp: 20, 24, 40, 48", "24")
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
      name = name.toLowerCase().replace(/\s+/g, "_");
      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const size = parseInt(opts.size, 10) || 24;

      if (!STYLE_MAP[style]) {
        throw new CliError(2, `Invalid style "${style}". Must be one of: ${Object.keys(STYLE_MAP).join(", ")}`);
      }
      if (!ANDROID_SIZES.includes(size as typeof ANDROID_SIZES[number])) {
        throw new CliError(2, `Invalid size "${size}". Must be one of: ${ANDROID_SIZES.join(", ")}`);
      }

      const fillSuffix = fill ? "_fill1" : "";
      const styleDir = STYLE_MAP[style];
      const url = `${GITHUB_RAW}/${name}/${styleDir}/${name}${fillSuffix}_${size}px.xml`;

      log.debug(`Fetching: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new CliError(1, `Android XML not found for icon "${name}" (${style}, ${size}dp). Try a different style or size.`);
      }

      const xml = await res.text();
      const outputPath = opts.output || `${name}_${size}dp.xml`;
      const fullPath = resolve(outputPath);

      mkdirSync(fullPath.replace(/\/[^/]+$/, ""), { recursive: true });
      writeFileSync(fullPath, xml);

      const result = {
        icon: name,
        style,
        fill: fill ? "yes" : "no",
        size_dp: size,
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
      name = name.toLowerCase().replace(/\s+/g, "_");
      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const outputDir = opts.outputDir || ".";

      if (!STYLE_MAP[style]) {
        throw new CliError(2, `Invalid style "${style}". Must be one of: ${Object.keys(STYLE_MAP).join(", ")}`);
      }

      const fillSuffix = fill ? "_fill1" : "";
      const styleDir = STYLE_MAP[style];
      const results: Record<string, unknown>[] = [];

      for (const size of ANDROID_SIZES) {
        const url = `${GITHUB_RAW}/${name}/${styleDir}/${name}${fillSuffix}_${size}px.xml`;
        log.debug(`Fetching: ${url}`);
        const res = await fetch(url);
        if (!res.ok) {
          log.warn(`Size ${size}dp not available for "${name}" (${style})`);
          continue;
        }

        const xml = await res.text();
        const filename = `${name}_${size}dp.xml`;
        const dir = resolve(outputDir);
        mkdirSync(dir, { recursive: true });
        writeFileSync(`${dir}/${filename}`, xml);

        results.push({
          icon: name,
          style,
          fill: fill ? "yes" : "no",
          size_dp: size,
          file: `${dir}/${filename}`,
          size_bytes: xml.length,
        });
      }

      if (results.length === 0) {
        throw new CliError(1, `No Android XML found for icon "${name}" (${style})`);
      }

      output(results, { json: opts.json });
      if (!opts.json) {
        log.success(`Downloaded ${results.length} Android XML files for "${name}" → ${resolve(outputDir)}`);
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
      const data = ANDROID_SIZES.map((s) => ({
        size_dp: s,
        description: `${s}dp icon`,
        xml_suffix: `_${s}px.xml`,
      }));
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
