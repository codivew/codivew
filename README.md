# Codivew

English | [한국어](./docs/README.ko.md)

[![npm version](https://img.shields.io/npm/v/codivew.svg)](https://www.npmjs.com/package/codivew)
[![npm downloads](https://img.shields.io/npm/dm/codivew.svg)](https://www.npmjs.com/package/codivew)
[![license](https://img.shields.io/npm/l/codivew.svg)](https://github.com/knsan189/codivew/blob/main/LICENSE)

Codivew reviews Git changes with an Ollama coding model and generates a standalone HTML report. It runs locally without a separate server or database.

## Features

- Review working tree, staged, or branch changes
- Get a summary and feedback by file and changed line
- Browse diffs in a collapsible, standalone HTML report
- Automatically exclude sensitive and generated files

## Requirements

- Node.js 18 or later
- Git
- Ollama available locally or over the network

Pull a coding model before starting a review:

```bash
ollama pull qwen3.6:35b-a3b-coding-mxfp8
```

## Installation

```bash
npm install -g codivew
codivew setup
```

`setup` connects to Ollama and saves the URL and model you select. If no configuration exists, Codivew starts setup automatically before the first interactive review.

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

Use a different Ollama server or model for one review:

```bash
codivew staged \
  --ollama-url http://ollama.example.com:11434 \
  --model qwen3.6:35b-a3b-coding-mxfp8
```

View all commands and options with:

```bash
codivew --help
```

## Output

Reports are saved under `.codivew/` in the directory where the command was run and open automatically in your browser.

```gitignore
.codivew/
```

Use `--silent` to prevent the browser from opening, or `--output` to choose the report path:

```bash
codivew staged --silent
codivew staged --output ./reports/review.html
```

## Excluded Files

Codivew excludes lockfiles, build output, generated files, environment files, private keys, certificates, minified JavaScript, and source maps. `.env.example` and `.env.sample` remain included.
