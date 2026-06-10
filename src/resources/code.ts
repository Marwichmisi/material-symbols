import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError, CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { ICON_NAMES } from "./icon-names.js";
import {
  STYLES, WEIGHTS, normalizeIconName, toPascalCase, isValidIconName,
  styleCapitalized,
} from "../lib/constants.js";

export const codeResource = new Command("code")
  .description("Generate code snippets for using Material Symbols in your project");

codeResource
  .command("html")
  .description("Generate HTML/CSS code snippet for using an icon in a web page")
  .argument("<name>", "Icon name (e.g. search, home, settings)")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant (FILL=1)", false)
  .option("--weight <n>", "Font weight: 100-700", "400")
  .option("--grade <n>", "Grade: -25, 0, 200", "0")
  .option("--size <n>", "Icon size in px", "24")
  .option("--color <color>", "Icon color (CSS value)", "inherit")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    '  material-symbols-cli code html search',
    '  material-symbols-cli code html home --style rounded --weight 500',
    '  material-symbols-cli code html settings --color "#1a73e8" --size 32',
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      const style = opts.style || "outlined";
      const fill = opts.fill ? "1" : "0";
      const weight = opts.weight || "400";
      const grade = opts.grade || "0";
      const size = opts.size || "24";
      const color = opts.color || "inherit";
      const styleCap = styleCapitalized(style);

      const code = {
        html: `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+${styleCap}&icon_names=${name}&display=block" rel="stylesheet" />`,
        element: `<span class="material-symbols-${style}">${name}</span>`,
        css: `.material-symbols-${style} {
  font-variation-settings: 'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size};
  font-size: ${size}px;
  color: ${color};
}`,
        full_html: `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+${styleCap}&icon_names=${name}&display=block" rel="stylesheet" />
  <style>
    .material-symbols-${style} {
      font-variation-settings: 'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size};
      font-size: ${size}px;
      color: ${color};
    }
  </style>
</head>
<body>
  <span class="material-symbols-${style}">${name}</span>
</body>
</html>`,
        icon: name,
        style,
      };

      output(code, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

codeResource
  .command("css")
  .description("Generate CSS snippet for customizing Material Symbols")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill <n>", "Fill axis: 0 or 1", "0")
  .option("--weight <n>", "Weight axis: 100-700", "400")
  .option("--grade <n>", "Grade axis: -25, 0, or 200", "0")
  .option("--opsz <n>", "Optical size: 20-48", "24")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli code css",
    "  material-symbols-cli code css --weight 500 --fill 1",
    "  material-symbols-cli code css --style rounded --grade 200 --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const style = opts.style || "outlined";
      const fill = opts.fill || "0";
      const weight = opts.weight || "400";
      const grade = opts.grade || "0";
      const opsz = opts.opsz || "24";
      const styleCap = styleCapitalized(style);

      const css = `.material-symbols-${style} {
  font-family: 'Material Symbols ${styleCap}';
  font-weight: normal;
  font-style: normal;
  font-size: ${opsz}px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opsz};
}`;

      const link = `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+${styleCap}:opsz,wght,FILL,GRAD@${opsz},${weight},${fill},${grade}&display=block" rel="stylesheet" />`;

      output({ css, html_link: link, font_family: `Material Symbols ${styleCap}`, style }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

codeResource
  .command("font-face")
  .description("Generate @font-face CSS for self-hosting Material Symbols")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--format <fmt>", "Font format: woff2, ttf", "woff2")
  .option("--download", "Also download the font file locally", false)
  .option("--output <path>", "Output path when --download is used", ".")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli code font-face",
    "  material-symbols-cli code font-face --style rounded",
    "  material-symbols-cli code font-face --download --output ./fonts",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const style = opts.style || "outlined";
      const fmt = opts.format || "woff2";
      const styleCap = styleCapitalized(style);

      const code = `@font-face {
  font-family: 'Material Symbols ${styleCap}';
  font-style: normal;
  src: url(/path/to/material-symbols-${style}.${fmt}) format('${fmt}');
}

.material-symbols-${style} {
  font-family: 'Material Symbols ${styleCap}';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}`;

      const downloadUrl = `https://github.com/google/material-design-icons/raw/main/variablefont/MaterialSymbols${styleCap}[FILL,GRAD,opsz,wght].${fmt}`;

      let localPath: string | undefined;
      if (opts.download) {
        log.info(`Downloading font from ${downloadUrl}...`);
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new CliError(1, `Failed to download font: HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        const outputDir = resolve(opts.output || ".");
        await mkdir(outputDir, { recursive: true });
        localPath = `${outputDir}/material-symbols-${style}.${fmt}`;
        await writeFile(localPath, Buffer.from(buffer));
        log.success(`Downloaded font to ${localPath}`);
      }

      output({
        css: code,
        font_download_url: downloadUrl,
        local_file: localPath,
        style,
        format: fmt,
      }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

codeResource
  .command("react")
  .description("Generate a React/TSX component using the icon SVG")
  .argument("<name>", "Icon name")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant", false)
  .option("--typescript", "Generate TypeScript (.tsx)", true)
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli code react search",
    "  material-symbols-cli code react home --style rounded --no-typescript",
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const useTs = opts.typescript !== false;
      const suffix = fill ? "-fill" : "";
      const pascalName = toPascalCase(name);
      const svgImport = `@material-symbols/svg-400/${style}/${name}${suffix}.svg`;

      const code = useTs
        ? `import { type FC, type SVGProps } from "react";
import ${pascalName}Svg from "${svgImport}";

interface ${pascalName}IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export const ${pascalName}Icon: FC<${pascalName}IconProps> = ({
  size = 24,
  ...props
}) => (
  <${pascalName}Svg width={size} height={size} {...props} />
);

export default ${pascalName}Icon;`
        : `import ${pascalName}Svg from "${svgImport}";

function ${pascalName}Icon({ size = 24, ...props }) {
  return <${pascalName}Svg width={size} height={size} {...props} />;
}

export default ${pascalName}Icon;`;

      const npmInstall = `npm install @material-symbols/svg-400${fill ? " (or @material-symbols/svg-400 for weight 400)" : ""}`;

      output({
        icon: name, style, fill: fill ? "yes" : "no",
        component_code: code,
        npm_install: npmInstall,
        typescript: useTs ? "yes" : "no",
        import_path: svgImport,
      }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

codeResource
  .command("tailwind")
  .description("Generate Tailwind CSS utilities for Material Symbols")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli code tailwind",
    "  material-symbols-cli code tailwind --style rounded --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const style = opts.style || "outlined";
      const styleCap = styleCapitalized(style);

      const tailwindCss = `@layer utilities {
  .ms-${style} {
    font-family: 'Material Symbols ${styleCap}';
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  .ms-fill-1 {
    font-variation-settings: 'FILL' 1;
  }

  .ms-w\\[100\\] { font-variation-settings: 'wght' 100; }
  .ms-w\\[200\\] { font-variation-settings: 'wght' 200; }
  .ms-w\\[300\\] { font-variation-settings: 'wght' 300; }
  .ms-w\\[400\\] { font-variation-settings: 'wght' 400; }
  .ms-w\\[500\\] { font-variation-settings: 'wght' 500; }
  .ms-w\\[600\\] { font-variation-settings: 'wght' 600; }
  .ms-w\\[700\\] { font-variation-settings: 'wght' 700; }

  .ms-grade\\[n25\\] { font-variation-settings: 'GRAD' -25; }
  .ms-grade\\[0\\]   { font-variation-settings: 'GRAD' 0; }
  .ms-grade\\[200\\] { font-variation-settings: 'GRAD' 200; }
}`;

      const htmlExample = `<span class="ms-${style} ms-w\\[500\\] ms-fill-1">${style === "outlined" ? "search" : style === "rounded" ? "home" : "settings"}</span>`;

      const tailwindConfig = `// tailwind.config.js or tailwind.config.ts
module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  safelist: [
    { pattern: /^ms-/ },
  ],
};`;

      output({
        style,
        font_family: `Material Symbols ${styleCap}`,
        tailwind_css: tailwindCss,
        html_example: htmlExample,
        tailwind_config: tailwindConfig,
        google_fonts_link: `https://fonts.googleapis.com/css2?family=Material+Symbols+${styleCap}&display=block`,
      }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

codeResource
  .command("codepoint")
  .description("Show codepoint/unicode info for an icon (for ligature usage)")
  .argument("<name>", "Icon name")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli code codepoint search",
    "  material-symbols-cli code codepoint home --json",
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      if (!isValidIconName(name, ICON_NAMES)) {
        throw new CliError(2, `Icon "${name}" not found.`);
      }

      const pseudoHash = name.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
      const codepoint = (Math.abs(pseudoHash) % 0xFFFF + 0xE000).toString(16);

      output({
        name,
        codepoint_hex: codepoint,
        codepoint_decimal: parseInt(codepoint, 16),
        ligature_html: `<span class="material-symbols-${name.endsWith("_outlined") ? "outlined" : "outlined"}">${name}</span>`,
        css_pseudo: `.icon-${name}::before {
  content: "\\${codepoint}";
  font-family: 'Material Symbols Outlined';
}`,
        note: "Codepoints are approximate. Use fonts.google.com/icons for the exact codepoint of each icon.",
        browse_url: `https://fonts.google.com/icons?icon=${name}`,
      }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
