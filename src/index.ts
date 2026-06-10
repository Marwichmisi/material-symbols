#!/usr/bin/env bun
import { Command } from "commander";
import { globalFlags } from "./lib/config.js";
import { authCommand } from "./commands/auth.js";
import { iconsResource } from "./resources/icons.js";
import { androidResource } from "./resources/android.js";
import { composeResource } from "./resources/compose.js";
import { codeResource } from "./resources/code.js";

const program = new Command();

program
  .name("material-symbols-cli")
  .description("Search, download, and generate code for Google Material Symbols icons")
  .version("0.1.0")
  .option("--json", "Output as JSON", false)
  .option("--format <fmt>", "Output format: text, json, csv, yaml", "text")
  .option("--verbose", "Enable debug logging", false)
  .option("--no-color", "Disable colored output")
  .option("--no-header", "Omit table/csv headers (for piping)")
  .hook("preAction", (_thisCmd, actionCmd) => {
    const root = actionCmd.optsWithGlobals();
    globalFlags.json = root.json ?? false;
    globalFlags.format = root.format ?? "text";
    globalFlags.verbose = root.verbose ?? false;
    globalFlags.noColor = root.color === false;
    globalFlags.noHeader = root.header === false;
  });

program.addCommand(authCommand);
program.addCommand(iconsResource);
program.addCommand(androidResource);
program.addCommand(composeResource);
program.addCommand(codeResource);

program.parse();
