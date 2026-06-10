import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError } from "../lib/errors.js";

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
      const style = opts.style || "outlined";
      const fill = opts.fill ? "1" : "0";
      const weight = opts.weight || "400";
      const grade = opts.grade || "0";
      const size = opts.size || "24";
      const color = opts.color || "inherit";

      const fontFamily = `Material Symbols ${style.charAt(0).toUpperCase() + style.slice(1)}`;

      const code = {
        html: `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+${style.charAt(0).toUpperCase() + style.slice(1)}&icon_names=${name}&display=block" rel="stylesheet" />`,
        element: `<span class="material-symbols-${style}">${name}</span>`,
        css: `.material-symbols-${style} {
  font-variation-settings: 'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size};
  font-size: ${size}px;
  color: ${color};
}`,
        full_html: `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+${style.charAt(0).toUpperCase() + style.slice(1)}&icon_names=${name}&display=block" rel="stylesheet" />
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

      const fontFamily = `Material Symbols ${style.charAt(0).toUpperCase() + style.slice(1)}`;

      const css = `.material-symbols-${style} {
  font-family: '${fontFamily}';
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

      const link = `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+${style.charAt(0).toUpperCase() + style.slice(1)}:opsz,wght,FILL,GRAD@${opsz},${weight},${fill},${grade}&display=block" rel="stylesheet" />`;

      output({ css, html_link: link, font_family: fontFamily, style }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

codeResource
  .command("font-face")
  .description("Generate @font-face CSS for self-hosting Material Symbols")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--format <fmt>", "Font format: woff2, ttf", "woff2")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli code font-face",
    "  material-symbols-cli code font-face --style rounded",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const style = opts.style || "outlined";
      const fmt = opts.format || "woff2";
      const fontFamily = `Material Symbols ${style.charAt(0).toUpperCase() + style.slice(1)}`;

      const code = `@font-face {
  font-family: '${fontFamily}';
  font-style: normal;
  src: url(/path/to/material-symbols-${style}.${fmt}) format('${fmt}');
}

.material-symbols-${style} {
  font-family: '${fontFamily}';
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

      const downloadUrl = `https://github.com/google/material-design-icons/raw/main/variablefont/MaterialSymbols${style.charAt(0).toUpperCase() + style.slice(1)}[FILL,GRAD,opsz,wght].${fmt}`;

      output({
        css: code,
        font_download_url: downloadUrl,
        style,
        format: fmt,
      }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
