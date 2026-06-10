import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError } from "../lib/errors.js";

export const composeResource = new Command("compose")
  .description("Generate Kotlin/Jetpack Compose code snippets");

composeResource
  .command("icon")
  .description("Generate a Kotlin composable function using the icon")
  .argument("<name>", "Icon name (e.g. search, home, settings)")
  .option("--style <style>", "Icon style: outlined, rounded, sharp", "outlined")
  .option("--fill", "Use filled variant", false)
  .option("--size <n>", "Icon size in dp (20, 24, 40, 48)", "24")
  .option("--package <pkg>", "Kotlin package name", "com.example.app")
  .option("--composable-name <name>", "Composable function name", "")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose icon search",
    "  material-symbols-cli compose icon home --style rounded --size 40",
    '  material-symbols-cli compose icon settings --package "com.myapp.ui" --composable-name SettingsIcon',
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = name.toLowerCase().replace(/\s+/g, "_");
      const style = opts.style || "outlined";
      const fill = opts.fill || false;
      const size = opts.size || "24";
      const pkg = opts.package || "com.example.app";
      const fillSuffix = fill ? "_fill1" : "";
      const styleMap: Record<string, string> = {
        outlined: "materialsymbolsoutlined",
        rounded: "materialsymbolsrounded",
        sharp: "materialsymbolssharp",
      };
      const styleDir = styleMap[style];
      const xmlFilename = `${name}_${size}dp.xml`;
      const drawableName = `${name}_${size}dp`;

      const composableName = opts.composableName ||
        name.split("_").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("") + "Icon";

      const composableFunction = `@Composable
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

      const usageExample = `${composableName}(tint = MaterialTheme.colorScheme.primary)`;

      const guide =
`// 1. Download the XML drawable:
//    material-symbols-cli android generate ${name} --style ${style} --size ${size} --output app/src/main/res/drawable/${xmlFilename}
//
// 2. Add the composable function to your project
//    (generated below)
//
// 3. Use it anywhere:
//    ${usageExample}`;

      const result = {
        icon: name,
        style,
        fill: fill ? "yes" : "no",
        size_dp: size,
        composable_name: composableName,
        package: pkg,
        composable_function: composableFunction,
        usage_example: usageExample,
        drawable_path: `res/drawable/${xmlFilename}`,
        guide,
      };

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
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose preview search",
    "  material-symbols-cli compose preview home --style rounded --size 48",
  ].join("\n"))
  .action(async (name: string, opts) => {
    try {
      name = name.toLowerCase().replace(/\s+/g, "_");
      const style = opts.style || "outlined";
      const size = opts.size || "24";
      const drawableName = `${name}_${size}dp`;

      const code = `@Preview(showBackground = true, widthDp = 64, heightDp = 64)
@Composable
private fun ${name.split("_").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("")}Preview() {
    Icon(
        painter = painterResource(R.drawable.${drawableName}),
        contentDescription = "${name}",
        modifier = Modifier.size(${size}dp),
        tint = MaterialTheme.colorScheme.primary
    )
}`;

      output({ icon: name, style, size_dp: size, preview_code: code }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

composeResource
  .command("migration-guide")
  .description("Show migration guide from material-icons-extended to Material Symbols")
  .option("--json", "Output as JSON")
  .addHelpText("after", [
    "Examples:",
    "  material-symbols-cli compose migration-guide",
  ].join("\n"))
  .action(async (opts) => {
    try {
      const guide =
`Material Icons (material-icons-extended) → Material Symbols Migration Guide
═══════════════════════════════════════════════════════════════════════════

Google recommends migrating from material-icons-extended to Material Symbols.

Step 1: Remove material-icons-extended dependency
    Remove from build.gradle.kts:
    - implementation("androidx.compose.material:material-icons-extended:...")

Step 2: Download individual icons as XML drawables
    material-symbols-cli android download <icon> --output-dir app/src/main/res/drawable

Step 3: Replace Icon composable calls

    Before (material-icons-extended):
      Icon(Icons.Default.Search, contentDescription = "Search")
      Icon(Icons.Outlined.Home, contentDescription = "Home")
      Icon(Icons.Rounded.Settings, contentDescription = "Settings")

    After (Material Symbols XML):
      Icon(painterResource(R.drawable.search_24dp), contentDescription = "Search")
      Icon(painterResource(R.drawable.home_24dp), contentDescription = "Home")
      Icon(painterResource(R.drawable.settings_24dp), contentDescription = "Settings")

Benefits of Material Symbols:
  ✓ 3,900+ icons (vs 2,000+ in Material Icons)
  ✓ Three styles: outlined, rounded, sharp (with fill variants)
  ✓ Variable font axes: weight (100-700), fill, grade, optical size
  ✓ Significantly smaller APK (only icons you use)
  ✓ Faster build times (no huge dependency)
  ✓ Active development - new icons added regularly`;

      output({ migration_guide: guide }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
