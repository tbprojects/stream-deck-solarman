# Stream Deck Solarman

An Elgato Stream Deck plugin that displays the battery status and state of charge of an energy storage system using data from [globalhome.solarmanpv.com](https://globalhome.solarmanpv.com/).

## Features

- **Battery view** — colored background with state of charge (%) updated every 60 s:
  - 🔵 blue — charging
  - 🟠 orange — discharging
  - 🟢 green — fully charged (100%)
  - ⚫ grey — standby
  - 🟣 purple border = off-grid mode
- **Details view** — shown on button press:
  - ☀ PV generation power
  - ⚡ consumption power
  - ▲ / ▼ grid exchange
- **Short press** — toggles between battery and details views
- **Long press** (≥ 500 ms) — opens [globalhome.solarmanpv.com](https://globalhome.solarmanpv.com/) in the default browser

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [Stream Deck](https://www.elgato.com/stream-deck) application 6.9+
- An account at [globalhome.solarmanpv.com](https://globalhome.solarmanpv.com/)

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Build the plugin

```bash
npm run build
```

The compiled bundle is written to `com.tbprojects.solarman.sdPlugin/bin/plugin.js`.

### 3. Install the plugin in Stream Deck

Create a symbolic link from the `.sdPlugin` directory to the Stream Deck plugins folder:

```bash
# macOS
ln -sf "$(pwd)/com.tbprojects.solarman.sdPlugin" \
  "$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins/com.tbprojects.solarman.sdPlugin"

# Windows (PowerShell — run as Administrator)
New-Item -ItemType SymbolicLink `
  -Path "$env:APPDATA\Elgato\StreamDeck\Plugins\com.tbprojects.solarman.sdPlugin" `
  -Target "$PWD\com.tbprojects.solarman.sdPlugin"
```

### 4. Restart Stream Deck

Close and reopen the Stream Deck application. The plugin will appear in the action list under **Solarman**.

### 5. Watch mode (auto-rebuild)

```bash
npm run watch
```

The plugin is rebuilt automatically on every source change. To reload changes, right-click the Stream Deck icon in the system tray → **Restart Stream Deck**.

## Configuration

After dragging the **Battery Status** action onto a key, fill in the Property Inspector:

| Field | Description |
|-------|-------------|
| **Grid ID** | Your plant ID — visible in API requests (see below) |
| **Auth Token** | Bearer token from the `Authorization` request header — see below |

### How to obtain the Grid ID and Auth Token

1. Open [globalhome.solarmanpv.com](https://globalhome.solarmanpv.com/) and log in.
2. Open DevTools (`F12`) → **Network** tab.
3. Reload the page and click any request matching `/maintain-s/operating/system/<ID>`.
4. The number at the end of the URL is your **Grid ID**.
5. In the request headers copy the value after `Bearer ` from the `Authorization` header — that is your **Auth Token**.

> **Note:** The token expires. If the button shows `err`, refresh the token in the Property Inspector.

## Distribution

### Prerequisites

Install the [Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/intro) globally (version ≥ 1.6 required for DRM support):

```bash
npm install -g @elgato/cli@latest
```

Verify the installed version:

```bash
streamdeck -v
```

### Package for distribution

```bash
npm run pack
```

This command:
1. Runs `npm run build` — compiles TypeScript to `bin/plugin.js`
2. Runs `streamdeck pack` — validates and bundles the `.sdPlugin` directory into a `.streamDeckPlugin` installer file

The resulting `com.tbprojects.solarman.streamDeckPlugin` file can be distributed directly (double-click to install) or submitted to the [Elgato Marketplace](https://marketplace.elgato.com/).

> Source maps and runtime logs are excluded from the package via `.sdignore`.

## Project structure

```
stream-deck-solarman/
├── src/
│   ├── plugin.ts                    # entry point — action registration
│   ├── types.ts                     # types (SolarmanSettings, SolarmanData)
│   ├── canvas.ts                    # SVG image builder
│   └── actions/
│       └── battery-status.ts        # main action logic
├── com.tbprojects.solarman.sdPlugin/
│   ├── manifest.json                # plugin metadata
│   ├── bin/                         # compiled output (git-ignored)
│   ├── imgs/                        # plugin and action icons
│   └── ui/
│       └── property-inspector.html  # settings panel
├── rollup.config.mjs                # bundler configuration
├── tsconfig.json
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | One-time build |
| `npm run watch` | Build with auto-rebuild on changes |
| `npm run pack` | Build + package into `.streamDeckPlugin` |
