import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError, CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { ICON_NAMES } from "./icon-names.js";
import {
  STYLES, WEIGHTS, normalizeIconName, toPascalCase, isValidIconName,
  COMPOSE_STYLE_MAP, COMPOSE_LIBRARY_STYLE, styleCapitalized,
} from "../lib/constants.js";

export const composeResource = new Command("compose")
  .description("Generate Kotlin/Jetpack Compose code snippets");

composeResource
  .command("icon")
  .description("Generate a Kotlin composable function using the icon")
  .argument("<name>", "Icon name (e.g. search, home, settings)")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant", false)
  .option("--weight <n>", "Font weight: 100-700", "400")
  .option("--grade <n>", "Grade: -25, 0, 200", "0")
  .option("--size <n>", "Icon size in dp (20, 24, 40, 48)", "24")
  .option("--package <pkg>", "Kotlin package name", "com.example.app")
  .option("--composable-name <name>", "Composable function name", "")
  .option("--use-library", "Generate code using official material-symbols library (Icon(Icons.Xxx)) instead of XML drawable", false)
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose icon search",
    "  material-symbols-cli compose icon home --style rounded --weight 500 --use-library",
    '  material-symbols-cli compose icon settings --package "com.myapp.ui" --composable-name SettingsIcon',
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      if (!isValidIconName(name, ICON_NAMES)) {
        throw new CliError(2, `Icon "${name}" not found. Run "icons list" or "icons search <query>" to find valid names.`);
      }

      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const weight = opts.weight || "400";
      const grade = opts.grade || "0";
      const size = opts.size || "24";
      const useLibrary = opts.useLibrary || false;

      if (!(STYLES as readonly string[]).includes(style)) {
        throw new CliError(2, `Invalid style "${style}". Must be one of: ${STYLES.join(", ")}`);
      }

      const pascalName = toPascalCase(name);
      const composableName = opts.composableName || `${pascalName}Icon`;
      const styleLabel = style.charAt(0).toUpperCase() + style.slice(1);

      let composableFunction: string;
      let usageExample: string;
      let dependencies: string[] = [];

      if (useLibrary) {
        const libraryArtifact = COMPOSE_LIBRARY_STYLE[style];
        const iconRef = `${COMPOSE_STYLE_MAP[style]}.${pascalName}`;
        dependencies = [
          `implementation("androidx.compose.material3:${libraryArtifact}:1.7.0")`,
        ];
        composableFunction = `@Composable
fun ${composableName}(
    modifier: Modifier = Modifier,
    tint: Color = LocalContentColor.current,
    weight: Int = ${weight},
    fill: Float = ${fill ? "1.0f" : "0.0f"},
    grade: Float = ${grade}.0f
) {
    Icon(
        imageVector = ${iconRef},
        contentDescription = "${name}",
        modifier = modifier,
        tint = tint
    )
}`;
        usageExample = `${composableName}(tint = MaterialTheme.colorScheme.primary)`;
      } else {
        const drawableName = `${name}_${size}dp`;
        dependencies = [`// No extra dependency needed (uses XML drawable in res/drawable/)`];
        composableFunction = `@Composable
fun ${composableName}(
    modifier: Modifier = Modifier,
    tint: Color = LocalContentColor.current
) {
    Icon(
        painter = painterResource(R.drawable.${drawableName}),
        contentDescription = "${name}",
        modifier = modifier,
        tint = tint
    )
}`;
        usageExample = `${composableName}(tint = MaterialTheme.colorScheme.primary)`;
      }

      const result: Record<string, unknown> = {
        icon: name,
        style,
        fill: fill ? "yes" : "no",
        weight,
        grade,
        size_dp: size,
        composable_name: composableName,
        package: opts.package || "com.example.app",
        use_library: useLibrary ? "yes" : "no (XML drawable)",
        dependencies,
        composable_function: composableFunction,
        usage_example: usageExample,
      };

      output(result, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

composeResource
  .command("dependency")
  .description("Generate build.gradle.kts dependency snippet for Material Symbols")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--version <ver>", "Library version", "1.7.0")
  .option("--use-version-catalog", "Generate version catalog (libs.versions.toml) snippet", false)
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose dependency",
    "  material-symbols-cli compose dependency --style rounded",
    "  material-symbols-cli compose dependency --use-version-catalog --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const style = opts.style || "outlined";
      const version = opts.version || "1.7.0";
      const artifact = COMPOSE_LIBRARY_STYLE[style];
      const versionCatalogName = `material-symbols-${style}`;

      const buildGradle = `dependencies {
    implementation("androidx.compose.material3:${artifact}:${version}")
}`;

      const versionCatalog = `[versions]
material-symbols = "${version}"

[libraries]
material-symbols-${style} = { module = "androidx.compose.material3:${artifact}", version.ref = "material-symbols" }`;

      const result: Record<string, unknown> = {
        style,
        version,
        artifact: `androidx.compose.material3:${artifact}`,
        build_gradle_snippet: buildGradle,
      };

      if (opts.useVersionCatalog) {
        result.version_catalog_snippet = versionCatalog;
      }

      output(result, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

composeResource
  .command("preview")
  .description("Generate a @Preview composable showing the icon")
  .argument("<name>", "Icon name")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--size <n>", "Icon size in dp", "24")
  .option("--use-library", "Use official library (Icons.Xxx) instead of XML drawable", false)
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose preview search",
    "  material-symbols-cli compose preview home --style rounded --size 48 --use-library",
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      const style = opts.style || "outlined";
      const size = opts.size || "24";
      const useLibrary = opts.useLibrary || false;
      const pascalName = toPascalCase(name);

      let code: string;
      if (useLibrary) {
        const iconRef = `${COMPOSE_STYLE_MAP[style]}.${pascalName}`;
        code = `@Preview(showBackground = true, widthDp = 64, heightDp = 64)
@Composable
private fun ${pascalName}Preview() {
    Icon(
        imageVector = ${iconRef},
        contentDescription = "${name}",
        modifier = Modifier.size(${size}dp),
        tint = MaterialTheme.colorScheme.primary
    )
}`;
      } else {
        const drawableName = `${name}_${size}dp`;
        code = `@Preview(showBackground = true, widthDp = 64, heightDp = 64)
@Composable
private fun ${pascalName}Preview() {
    Icon(
        painter = painterResource(R.drawable.${drawableName}),
        contentDescription = "${name}",
        modifier = Modifier.size(${size}dp),
        tint = MaterialTheme.colorScheme.primary
    )
}`;
      }

      output({ icon: name, style, size_dp: size, use_library: useLibrary ? "yes" : "no", preview_code: code }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

composeResource
  .command("migration-guide")
  .description("Show migration guide from material-icons-extended to Material Symbols")
  .option("--style <style>", "Target style for migration", "outlined")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose migration-guide",
    "  material-symbols-cli compose migration-guide --style rounded --json",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const style = opts.style || "outlined";
      const libraryArtifact = COMPOSE_LIBRARY_STYLE[style];
      const iconStyle = COMPOSE_STYLE_MAP[style];

      const guide =
`Material Icons (material-icons-extended) → Material Symbols Migration Guide
═══════════════════════════════════════════════════════════════════════════

Option A: Use official Compose library (recommended)
────────────────────────────────────────────────────

1. Add dependency to build.gradle.kts:
    implementation("androidx.compose.material3:${libraryArtifact}:1.7.0")

2. Replace Icon imports:
    Before:  import androidx.compose.material.icons.Icons
             import androidx.compose.material.icons.filled.Search
    After:   import androidx.compose.material3.icons.Icons
             import androidx.compose.material3.icons.${style}.Search

3. Use in code:
    Before:  Icon(Icons.Default.Search, contentDescription = "Search")
    After:   Icon(${iconStyle}.Search, contentDescription = "Search")

Option B: Use individual XML drawables (leaner APK)
────────────────────────────────────────────────────

1. Download XML drawables:
    material-symbols-cli android download <icon> --style ${style} --output-dir app/src/main/res/drawable

2. Use in Compose:
    Icon(painterResource(R.drawable.<icon>_24dp), contentDescription = "<icon>")

Benefits of Material Symbols:
  ✓ 3,900+ icons (vs 2,000+ in Material Icons previously)
  ✓ Three styles: outlined, rounded, sharp (with fill variants)
  ✓ Variable font axes: weight (100-700), fill, grade, optical size
  ✓ Significantly smaller APK (only icons you use or no dependency bloat)
  ✓ Faster build times
  ✓ Active development - new icons added regularly`;

      output({ migration_guide: guide, style, library_artifact: `androidx.compose.material3:${libraryArtifact}` }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

composeResource
  .command("import")
  .description("Generate the correct Kotlin import statements for the icon")
  .argument("<name>", "Icon name")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose import search",
    "  material-symbols-cli compose import home --style rounded",
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = normalizeIconName(name);
      const style = opts.style || "outlined";
      const pascalName = toPascalCase(name);

      const imports = [
        `import androidx.compose.material3.Icon`,
        `import androidx.compose.material3.icons.${style}.${pascalName}`,
        `// For Material 3 icons, also add to build.gradle.kts:`,
        `// implementation("androidx.compose.material3:${COMPOSE_LIBRARY_STYLE[style]}:1.7.0")`,
      ];

      output({ icon: name, style, imports }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
