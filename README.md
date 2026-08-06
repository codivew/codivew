# Codivew

English | [한국어](./docs/README.ko.md)

[![npm version](https://img.shields.io/npm/v/codivew.svg)](https://www.npmjs.com/package/codivew)
[![npm downloads](https://img.shields.io/npm/dm/codivew.svg)](https://www.npmjs.com/package/codivew)
[![license](https://img.shields.io/npm/l/codivew.svg)](https://github.com/knsan189/codivew/blob/main/LICENSE)

Codivew reviews Git changes through an OpenAI-compatible API and generates standalone HTML or machine-readable JSON reports. It runs without a separate Codivew server or database.

## Features

- Review working tree, staged, or branch changes
- Get a summary and feedback by file and changed line
- Browse diffs in a collapsible, standalone HTML report
- Export structured review results as JSON
- Automatically exclude sensitive and generated files

## Requirements

- Node.js 18 or later
- Git
- An OpenAI-compatible API with model listing and chat completion endpoints

Local Ollama works through its OpenAI-compatible endpoint. Pull a model before using it:

```bash
ollama pull qwen3.6:35b-a3b-coding-mxfp8
```

## Installation

```bash
npm install -g codivew
codivew setup
```

`setup` lets you choose `ko-KR` or `en`, an authentication method (`None`, API Key/Bearer, or Basic Authentication), the API URL, and a model returned by `GET /v1/models`. Reviews use `POST /v1/chat/completions`. The local Ollama default is `http://localhost:11434/v1` with no authentication.

Run `codivew setup` again at any time to change the endpoint or authentication. Credentials are entered without terminal echo, stored only in the user configuration file with owner-only permissions, and never displayed by `config show`.

Change the saved language without running setup again:

```bash
codivew config set language en
codivew config set language ko-KR
```

To update Codivew:

```bash
npm install -g codivew@latest
```

## Usage

Run Codivew anywhere inside a Git repository.

```bash
# Review unstaged changes and untracked files
codivew
codivew working

# Review staged changes
codivew staged

# Review changes between main and HEAD
codivew branch

# Use a different base branch
codivew branch --base develop
```

Add project context with repeatable `--context` options:

```bash
codivew staged \
  --context "Node.js CLI project" \
  --context "Must support Node.js 18 or later"
```

Use a different OpenAI-compatible endpoint or model for one review. Saved authentication is still used:

```bash
codivew staged \
  --api-url https://api.example.com/v1 \
  --model qwen3.6:35b-a3b-coding-mxfp8
```

View all commands and options with:

```bash
codivew --help
```

## Output

Reports are saved under `.codivew/` in the directory where the command was run. HTML reports open automatically in your browser.

```gitignore
.codivew/
```

Use `--no-open` to prevent the browser from opening, or `--output` to choose the report path:

```bash
codivew staged --no-open
codivew staged --output ./reports/review.html
codivew staged --format json
codivew staged --format both --output ./reports/review
```

`--format` accepts `html` (default), `json`, or `both`. JSON-only output never opens a browser. With `both`, Codivew writes `.html` and `.json` files using the same base name and opens only the HTML report.

## Excluded Files

Codivew excludes lockfiles, build output, generated files, environment files, private keys, certificates, minified JavaScript, and source maps. `.env.example` and `.env.sample` remain included.
