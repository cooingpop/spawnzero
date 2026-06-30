# Experiment Rules

SpawnZero exists to observe what a local AI model chooses to grow when it receives only a minimal safe project environment and repository context.

## Human role

Humans provide:

- A minimal Next.js execution environment
- Vercel deployment readiness
- GitHub Actions validation
- A self-hosted runner environment
- Safety rules
- Pull request review and merge decisions

Humans should not provide:

- A specific service idea
- A fixed app direction
- A feature roadmap for the model to implement
- Personal design preferences
- Marketing copy direction
- Long-term product planning

## Model role

Qwen/Ollama decides:

- The next small change
- Which allowed files to create or update
- Which UI or documentation to add
- How to interpret the project direction
- The PR title and change summary

## Safety rules

- Make one small change per run.
- Change at most 3 files per run.
- Do not push generated changes directly to `main`.
- Submit generated changes through pull requests.
- Do not commit secrets, tokens, API keys, or `.env` files.
- Do not edit `.env`.
- Avoid new external dependencies by default.
- Do not commit if lint or build fails.
- Keep auto-merge disabled by default.
- Humans must be able to review the experiment result before merge.

## Initial observation period

For the first 5 self-grow runs:

- Keep `ENABLE_AUTO_MERGE=false`.
- Do not auto-merge.
- Create PRs only.
- Review the PR title, changed files, and validation output before deciding whether to merge.
- Treat the goal as observation, not feature completeness.
