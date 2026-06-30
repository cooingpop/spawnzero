# SpawnZero

SpawnZero is an open experiment where AI starts from zero and grows a project one step at a time.

The repository begins with a minimal Next.js web base that is ready to connect with Vercel. After this bootstrap, future changes are intended to be proposed by a local AI model, validated by the project checks, and submitted as pull requests.

## Current status

- Next.js App Router bootstrap
- TypeScript and Tailwind CSS
- Vercel-ready landing page
- CI workflow for lint and build
- Local Ollama/Qwen self-grow script scaffold

## Experiment model

SpawnZero is not a product plan handed to an AI. The human role is to provide a safe execution environment, review pull requests, and decide whether to merge. The local model receives repository context and decides one small next change by itself.

Self-grow changes are generated locally through Ollama using `qwen3:8b`. The model does not know GitHub directly. The script reads repo, PR, and CI context, sends that context to the model, validates the response, runs checks, commits to a new branch, pushes the branch, and opens a pull request when GitHub CLI is available.

## Local development

```bash
npm install
npm run dev
```

Open the local Next.js URL printed by the dev server.

## Validation

```bash
npm run lint
npm run build
```

## Self-grow

Requirements:

- Ollama running at `http://localhost:11434`
- `qwen3:8b` pulled locally
- GitHub CLI installed and authenticated if PR creation is desired
- A clean `main` branch

```bash
npm run grow
```

The script only runs from `main`, creates an `auto/grow-YYYYMMDD-HHmm` branch, and submits generated changes as a PR. Direct pushes to `main` are reserved for the initial bootstrap only.

## Public repo safety

Do not commit secrets, tokens, API keys, or local `.env` files. Only `.env.example` belongs in the repository. Auto-merge is disabled by default and should remain disabled for the initial observation period.
