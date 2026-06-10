# material-symbols-cli

Search, download, and generate code for Google's **Material Symbols** (3,900+ icons) — directly from your terminal.

Supports Android Vector Drawables (XML), Jetpack Compose (Kotlin), SVG downloads, and HTML/CSS snippets.

Made with [api2cli.dev](https://api2cli.dev).

## Install

### Via npx (no install)

```bash
npx material-symbols-cli --help
```

### Via api2cli (recommended)

```bash
npx api2cli install Marwichmisi/material-symbols
```

### Via npm

```bash
npm install -g material-symbols-cli
```

### Link the skill to your project

After installing, make the agent skill available locally:

```bash
cd /path/to/your/project
material-symbols-cli init
```

This installs the skill into `.agents/`, `.claude/`, or `.opencode/` in your project — nothing global.

## Usage

```bash
material-symbols-cli --help
```

### Search icons

```bash
# List all icons filtered by keyword
material-symbols-cli icons list --search home --limit 10

# Search with detailed info
material-symbols-cli icons search arrow --json

# Get full details for a specific icon
material-symbols-cli icons get search
```

### Download SVG

```bash
# Download as SVG (outlined, weight 400)
material-symbols-cli icons download search --style outlined --output icon.svg

# Download filled variant with custom weight
material-symbols-cli icons download favorite --style rounded --fill --weight 500
```

### Android Vector Drawables (XML)

```bash
# Generate a single Android XML
material-symbols-cli android generate search --style outlined --size 24 --output app/src/main/res/drawable/ic_search.xml

# Download all sizes (20, 24, 40, 48dp) at once
material-symbols-cli android download search --style outlined --output-dir app/src/main/res/drawable

# List available Android sizes
material-symbols-cli android sizes
```

### Jetpack Compose (Kotlin)

```bash
# Generate a @Composable function for the icon
material-symbols-cli compose icon search --style rounded --size 24

# Generate a @Preview composable
material-symbols-cli compose preview home --style outlined --size 48

# Get the migration guide from material-icons-extended
material-symbols-cli compose migration-guide
```

### Web / HTML / CSS

```bash
# Generate HTML/CSS snippet
material-symbols-cli code html settings --style rounded --weight 500 --color "#1a73e8"

# Generate CSS with font-variation-settings
material-symbols-cli code css --style sharp --fill 1 --weight 600

# Generate @font-face for self-hosting
material-symbols-cli code font-face --style outlined
```

## Resources

| Resource | Description |
|----------|-------------|
| `icons` | Search, get info, and download Material Symbols icons |
| `android` | Generate and download Android Vector Drawable XML icons |
| `compose` | Generate Kotlin/Jetpack Compose code snippets |
| `code` | Generate HTML/CSS/JS code snippets |
| `init` | Install the agent skill into your project (local only) |
| `auth` | Manage API authentication (not required for public data) |

## Styles

- **outlined** — Default outlined style
- **rounded** — Rounded corners style
- **sharp** — Sharp corners style

Each style has **filled** variants.

## Weights

100 (Thin) through 700 (Bold), default is 400 (Regular).

## Global Flags

All commands support: `--json`, `--format <fmt>` (`text`, `json`, `csv` or `yaml`), `--verbose`, `--no-color`, `--no-header`

Exit codes: 0 = success, 1 = API error, 2 = usage error

## License

Apache License 2.0. Material Symbols are available under the [Apache License Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).
