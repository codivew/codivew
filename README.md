# Codivew

English | [한국어](./docs/README.ko.md)

[![npm version](https://img.shields.io/npm/v/codivew.svg)](https://www.npmjs.com/package/codivew)
[![npm downloads](https://img.shields.io/npm/dm/codivew.svg)](https://www.npmjs.com/package/codivew)
[![license](https://img.shields.io/npm/l/codivew.svg)](https://github.com/knsan189/codivew/blob/main/LICENSE)

Codivew is a CLI that reviews Git changes with an Ollama coding model and generates a standalone HTML report containing file-level feedback and diffs. It runs entirely locally without a separate server or database.

- Engine: **Codivew Engine**
- Command: `codivew`
- npm package: `codivew`

## Features

- Review working tree changes, staged changes, or diffs between branches
- Run reviews locally with any Ollama model you choose, without a separate server
- Get a review summary and feedback by file and changed line
- Browse long changes in a collapsible, file-by-file HTML report
- Automatically exclude sensitive files and generated files that are not useful for review
- Save results automatically and open them in your browser
- Support for macOS, Linux, and Windows

## Requirements

- Node.js 18 or later
- Git
- Ollama available locally or over the network

Pull the model you want to use before starting a review.

```bash
ollama pull qwen3.6:35b-a3b-coding-mxfp8
```

## Installation

```bash
npm install -g codivew
codivew setup
```

To update Codivew, install the latest version globally again.

```bash
npm install -g codivew@latest
```

Codivew checks the `latest` version once a day when it runs. If a newer version is available, it prints update instructions after the command finishes. Use `--no-update-notifier` to skip the check for the current run, or set `NO_UPDATE_NOTIFIER=1` to disable it permanently.

## Initial Setup

```bash
codivew setup
```

`setup` connects to your Ollama URL, retrieves the installed models, and saves the selected URL and model to your user configuration file.

```text
Codivew initial setup

Ollama URL (http://localhost:11434):
  ✓ Connected · 2 models

Model to use:
  1. qwen3.6:35b-a3b-coding-mxfp8
  2. qwen2.5-coder:14b
Select (1):
```

Configuration file locations:

| Operating system | Path                                                |
| ---------------- | --------------------------------------------------- |
| macOS            | `~/Library/Application Support/Codivew/config.json` |
| Linux            | `${XDG_CONFIG_HOME:-~/.config}/codivew/config.json` |
| Windows          | `%APPDATA%\Codivew\config.json`                     |

If you start your first review in an interactive terminal without saved configuration, `setup` starts automatically. In a non-interactive environment such as CI, prepare a saved configuration or specify both `--ollama-url` and `--model`.

Configuration precedence is: CLI options → user configuration file → defaults.

## Usage

Codivew searches upward from the current directory to find the Git repository root.

```bash
# Unstaged changes and new files not yet tracked by Git
codivew
codivew working

# Changes staged with git add
codivew staged

# Changes between main and the current HEAD
codivew branch

# Compare the current HEAD with another base branch
codivew branch --base develop
```

You can add project context to a review. `--context` may be used up to 20 times.

```bash
codivew staged \
  --context "Node.js CLI project" \
  --context "Must support Node.js 18 or later"
```

### Output Files

By default, reports are saved in `.codivew/` under the directory where the command was run and opened automatically in your browser.

```text
.codivew/
└── codivew-20260728-140509.html
```

If a file with the same timestamp already exists, Codivew appends a sequence number such as `codivew-20260728-140509-001.html` to preserve the existing report. We recommend adding the following entry to your project's `.gitignore`:

```gitignore
.codivew/
```

Use `--silent` to prevent the browser from opening.

```bash
codivew staged --silent
```

You can also choose the output path. If the `.html` extension is omitted, it is added automatically.

```bash
codivew staged --output ./reports/review.html
```

### Viewing and Updating Configuration

```bash
codivew config show
codivew config set ollama-url http://localhost:11434
codivew config set model qwen3.6:35b-a3b-coding-mxfp8
```

You can use a different Ollama server or model for a single run without modifying the saved configuration.

```bash
codivew staged \
  --ollama-url http://ollama.example.com:11434 \
  --model qwen3.6:35b-a3b-coding-mxfp8
```

## Review Modes

| Mode      | Git comparison               | Default |
| --------- | ---------------------------- | ------- |
| `working` | `git diff` + untracked files | Yes     |
| `staged`  | `git diff --cached`          | No      |
| `branch`  | `git diff <base>...HEAD`     | No      |

All modes review added, modified, and renamed files. `working` also reviews untracked files that are not excluded by `.gitignore`.

## Command Reference

```text
Usage: codivew [working|staged|branch] [options]

Commands:
  setup                 Configure the Ollama connection and model interactively
  config show           Show the saved user configuration
  config set <key> <v>  Set ollama-url or model

Modes:
  working               Review working tree changes (default)
  staged                Review staged changes
  branch                Review changes between a base branch and HEAD

Options:
  -b, --base <branch>    Base branch for branch mode (default: main)
  -c, --context <text>   Add project context; may be used multiple times
  -o, --output <path>    HTML output file path
      --silent           Do not open the browser
      --no-update-notifier Disable the update notification for this run
      --ollama-url <url> Ollama URL for this run
      --model <name>     Model for this run
  -h, --help             Show help
  -v, --version          Show version
```

## Excluded Files

Codivew automatically excludes diffs that are likely to be sensitive or not useful to the model.

- npm, pnpm, Yarn, and Bun lockfiles
- `dist`, `build`, `coverage`, `.next`, and `generated` directories
- `.env`, `.env.*`, private keys, and certificate files
- Minified JavaScript and source maps

`.env.example` and `.env.sample` remain included. Codivew exits with an error if no reviewable diff remains after exclusions.

## How It Works

```text
Generate Git diff
  → Filter excluded files
  → Build the Codivew Engine prompt
  → Request and validate an Ollama review
  → Render an HTML report
  → Save it under .codivew/
  → Open it in the browser
```

## Running from Source

```bash
npm install
npm run dev -- --help
```

To test Codivew as a global command, build it and use `npm link`.

```bash
npm run build
npm link
codivew --version
```

## Development Commands

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
npm run generate:report-style
npm run build
npm run check
```

`generate:report-style` compiles only the Tailwind utilities used by the report renderer and generates the TypeScript module embedded in the final HTML `<style>` element. This runs automatically before `dev`, `typecheck`, `test`, and `build`. The report body is rendered to a string on the server from the Preact JSX components in `src/reporting/review-report.tsx`, and review data is escaped by JSX.

Check which files will be included in the published package with:

```bash
npm pack --dry-run
```
