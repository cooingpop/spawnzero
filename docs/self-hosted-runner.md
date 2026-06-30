# Self-hosted Runner

The self-grow workflow requires a local Windows self-hosted runner with Ollama. GitHub-hosted runners must not run AI generation for this project.

## Setup outline

1. Open the GitHub repository.
2. Go to Settings -> Actions -> Runners.
3. Select New self-hosted runner.
4. Choose Windows.
5. Follow GitHub's download, configure, and run commands on the local PC.

The PC must be powered on and the runner process must be active when the workflow is dispatched.

## Ollama requirements

Install Ollama on the same Windows machine and pull the model:

```bash
ollama pull qwen3:8b
```

The script expects Ollama at:

```bash
http://localhost:11434
```

## Public repository safety

This is a public repository. Do not store secrets, tokens, API keys, personal files, or local `.env` files in the repo. The workflow should only use local model access and normal GitHub repository permissions.

## Workflow behavior

`.github/workflows/self-grow.yml` runs only on `self-hosted`. It installs dependencies and runs:

```bash
npm run grow
```

The generated change should be pushed to a new branch and submitted as a pull request. It should not be pushed directly to `main`.
