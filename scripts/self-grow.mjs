import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";
const ENABLE_AUTO_MERGE = process.env.ENABLE_AUTO_MERGE === "true";
const AUTHOR_NAME = "cooingpop";
const AUTHOR_EMAIL = "cooingpop@gmail.com";
const SELF_GROW_TAG = "[self-grow:qwen3]";
const ALLOWED_TYPES = new Set(["feat", "fix", "refactor", "docs", "style", "chore", "test", "ci"]);
const ALLOWED_ROOT_FILES = new Set(["README.md", "package.json"]);
const ALLOWED_DIRS = ["src/", "app/", "components/", "docs/", "public/"];
const FORBIDDEN_PATHS = [".env", "package-lock.json"];
const FORBIDDEN_PREFIXES = [".git/", "node_modules/", ".next/", ".vercel/"];
const MAX_GENERATE_ATTEMPTS = 3;
const RAW_RESPONSE_LOG_LIMIT = 1800;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    shell: false,
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed${details ? `\n${details}` : ""}`);
  }

  return (result.stdout ?? "").trim();
}

function tryRun(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function ensureGitIdentity() {
  run("git", ["config", "user.name", AUTHOR_NAME]);
  run("git", ["config", "user.email", AUTHOR_EMAIL]);
}

function assertRepoReady() {
  const branch = run("git", ["branch", "--show-current"]);
  if (branch !== "main") {
    throw new Error(`self-grow must run from main. Current branch: ${branch || "unknown"}`);
  }

  const status = run("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error(`working tree must be clean before self-grow runs:\n${status}`);
  }
}

function readText(path, maxChars = 6000) {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").slice(0, maxChars);
}

function listTree(base, maxEntries = 80) {
  const absolute = resolve(ROOT, base);
  if (!existsSync(absolute)) return [];
  const entries = [];

  function walk(dir, prefix = "") {
    if (entries.length >= maxEntries) return;
    for (const name of readdirSync(dir).sort()) {
      if (entries.length >= maxEntries) return;
      if (["node_modules", ".next", ".git"].includes(name)) continue;
      const full = resolve(dir, name);
      const relative = `${prefix}${name}`;
      entries.push(relative);
      if (statSync(full).isDirectory()) walk(full, `${relative}/`);
    }
  }

  walk(absolute);
  return entries;
}

function collectContext() {
  const packageJson = JSON.parse(readText(resolve(ROOT, "package.json")) || "{}");
  const recentCommits = tryRun("git", ["log", "-5", "--oneline"]).stdout || "No commits yet";
  const openPrs = getOpenPullRequests();

  return {
    branch: run("git", ["branch", "--show-current"]),
    recentCommits,
    packageScripts: packageJson.scripts ?? {},
    readme: readText(resolve(ROOT, "README.md"), 2500),
    srcTree: listTree("src"),
    appTree: listTree("app"),
    docsTree: listTree("docs"),
    openPullRequests: openPrs,
  };
}

function getOpenPullRequests() {
  const ghAvailable = tryRun("gh", ["--version"]);
  if (!ghAvailable.ok) return "GitHub CLI not available";

  const prs = tryRun("gh", ["pr", "list", "--state", "open", "--limit", "10", "--json", "number,title,headRefName,url"]);
  if (!prs.ok) return `GitHub CLI unavailable or not authenticated: ${prs.stderr || prs.stdout}`;
  return prs.stdout || "[]";
}

async function assertOllamaModel() {
  const response = await fetch(`${OLLAMA_HOST}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama tags request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const models = Array.isArray(data.models) ? data.models : [];
  const hasModel = models.some((model) => model.name === OLLAMA_MODEL || model.model === OLLAMA_MODEL);
  if (!hasModel) {
    throw new Error(`Ollama model ${OLLAMA_MODEL} was not found. Run: ollama pull ${OLLAMA_MODEL}`);
  }
}

function buildPrompt(context, attempt = 1) {
  return `You are the local AI growth engine for SpawnZero.

SpawnZero philosophy:
This project is not about a human planning a service and asking AI to implement it. The experiment observes what a local AI chooses to build when given only a minimal safe execution environment and repository context.

Your task:
Read the current repository state and decide exactly one small next change that would make SpawnZero a more meaningful project.

Do not follow human service ideas, specific app directions, personal design taste, marketing direction, or long-term product planning. Decide from the repo state and experiment purpose only.

Rules:
- Make only one small change.
- Modify at most 3 files.
- Do not create or modify secrets, .env files, tokens, or API keys.
- Do not request a GitHub token or API key.
- Do not add external dependencies unless truly necessary.
- Keep the project buildable.
- Do not delete files.
- Only use create or update actions.
- Return JSON only. No Markdown, no commentary.
- Do not use markdown.
- Do not wrap in code fences.
- Return a single JSON object only.
- No comments.
- No trailing commas.
- Every file content must be a JSON string.
- Escape newlines as needed through JSON serialization.

Allowed paths:
- src/**
- app/**
- components/**
- docs/**
- README.md
- public/**
- package.json

Forbidden paths:
- .env
- .git/**
- node_modules/**
- .next/**
- .vercel/**
- package-lock.json

JSON shape:
{
  "title": "short change title",
  "type": "feat|fix|refactor|docs|style|chore|test|ci",
  "summary": "what will change",
  "files": [
    {
      "path": "relative/path",
      "action": "create|update",
      "content": "full file content"
    }
  ]
}

${attempt > 1 ? "Your previous response was invalid JSON. Return only valid JSON matching the schema.\n\n" : ""}Repository context:
${JSON.stringify(context, null, 2)}
`;
}

async function generateChange(context) {
  let lastError = null;
  let lastRawResponse = "";

  for (let attempt = 1; attempt <= MAX_GENERATE_ATTEMPTS; attempt += 1) {
    const rawResponse = await requestOllamaChange(context, attempt);
    lastRawResponse = rawResponse;
    logRawResponse(rawResponse, attempt);

    try {
      const change = parseJsonResponse(rawResponse);
      validateChange(change);
      return change;
    } catch (error) {
      lastError = error;
      console.log(`Ollama response attempt ${attempt} was invalid: ${formatError(error)}`);
      if (attempt < MAX_GENERATE_ATTEMPTS) {
        console.log("Retrying with stricter JSON instructions.");
      }
    }
  }

  throw new Error(
    `Ollama did not return valid self-grow JSON after ${MAX_GENERATE_ATTEMPTS} attempts. Last error: ${formatError(
      lastError,
    )}\nRaw response excerpt:\n${truncateForLog(lastRawResponse)}`,
  );
}

async function requestOllamaChange(context, attempt) {
  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildPrompt(context, attempt),
      stream: false,
      format: "json",
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama generate request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return typeof data.response === "string" ? data.response : JSON.stringify(data.response ?? "");
}

function parseJsonResponse(text) {
  const candidate = extractJsonCandidate(text);
  return JSON.parse(candidate);
}

function extractJsonCandidate(text) {
  const withoutThinking = String(text ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const source = (fenced ? fenced[1] : withoutThinking).trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("response did not contain a complete JSON object");
  }

  return source.slice(start, end + 1).trim();
}

function logRawResponse(rawResponse, attempt) {
  console.log(`Ollama raw response attempt ${attempt} excerpt:`);
  console.log(truncateForLog(rawResponse));
}

function truncateForLog(value) {
  const text = String(value ?? "").replace(/\r/g, "");
  if (text.length <= RAW_RESPONSE_LOG_LIMIT) return text;
  return `${text.slice(0, RAW_RESPONSE_LOG_LIMIT)}\n... [truncated ${text.length - RAW_RESPONSE_LOG_LIMIT} chars]`;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeRepoPath(path) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function validateChange(change) {
  if (!change || typeof change !== "object" || Array.isArray(change)) {
    throw new Error("change must be a JSON object");
  }

  const allowedKeys = new Set(["title", "type", "summary", "files"]);
  for (const key of Object.keys(change)) {
    if (!allowedKeys.has(key)) throw new Error(`unexpected top-level key: ${key}`);
  }

  if (typeof change.type !== "string" || !ALLOWED_TYPES.has(change.type)) {
    throw new Error(`invalid change type: ${change.type}`);
  }
  if (typeof change.title !== "string" || change.title.trim().length === 0) {
    throw new Error("title must be a non-empty string");
  }
  if (typeof change.summary !== "string" || change.summary.trim().length === 0) {
    throw new Error("summary must be a non-empty string");
  }
  if (!Array.isArray(change.files) || change.files.length === 0) {
    throw new Error("files must be a non-empty array");
  }
  if (change.files.length > 3) throw new Error("self-grow may modify at most 3 files");

  const seenPaths = new Set();
  for (const [index, file] of change.files.entries()) {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      throw new Error(`files[${index}] must be an object`);
    }

    const allowedFileKeys = new Set(["path", "action", "content"]);
    for (const key of Object.keys(file)) {
      if (!allowedFileKeys.has(key)) throw new Error(`unexpected key in files[${index}]: ${key}`);
    }

    if (typeof file.path !== "string" || file.path.trim().length === 0) {
      throw new Error(`files[${index}].path must be a non-empty string`);
    }
    file.path = normalizeRepoPath(file.path.trim());
    if (seenPaths.has(file.path)) throw new Error(`duplicate file path: ${file.path}`);
    seenPaths.add(file.path);

    if (!["create", "update"].includes(file.action)) throw new Error(`invalid action for ${file.path}`);
    if (typeof file.content !== "string") throw new Error(`content must be a string for ${file.path}`);
    validatePath(file.path);
  }
}

function validatePath(path) {
  if (!path || path.startsWith("/") || path.includes("..")) throw new Error(`unsafe path: ${path}`);
  if (FORBIDDEN_PATHS.includes(path)) throw new Error(`forbidden path: ${path}`);
  if (FORBIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix))) throw new Error(`forbidden path: ${path}`);

  const isAllowed = ALLOWED_ROOT_FILES.has(path) || ALLOWED_DIRS.some((prefix) => path.startsWith(prefix));
  if (!isAllowed) throw new Error(`path is not allowed: ${path}`);
}

function applyFiles(files) {
  const snapshots = [];

  for (const file of files) {
    const absolute = resolve(ROOT, file.path);
    if (!absolute.startsWith(ROOT + sep)) throw new Error(`resolved path escaped repo: ${file.path}`);

    const existed = existsSync(absolute);
    snapshots.push({ path: absolute, existed, content: existed ? readFileSync(absolute, "utf8") : null });
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.content, "utf8");
  }

  return snapshots;
}

function restoreSnapshots(snapshots) {
  for (const snapshot of snapshots.reverse()) {
    if (snapshot.existed) {
      writeFileSync(snapshot.path, snapshot.content, "utf8");
    } else if (existsSync(snapshot.path)) {
      rmSync(snapshot.path, { force: true });
    }
  }
}

function runValidationOrRestore(snapshots) {
  try {
    run("npm", ["run", "lint"], { stdio: "inherit" });
    run("npm", ["run", "build"], { stdio: "inherit" });
    return {
      lint: "npm run lint: passed",
      build: "npm run build: passed",
    };
  } catch (error) {
    restoreSnapshots(snapshots);
    throw error;
  }
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function sanitizeMessage(title) {
  return title
    .replace(/\s*\[self-grow:qwen3\]\s*/gi, "")
    .replace(/^(feat|fix|refactor|docs|style|chore|test|ci):\s*/i, "")
    .trim()
    .slice(0, 80);
}

function createBranchCommitAndPush(change) {
  const branch = `auto/grow-${timestamp()}`;
  const message = sanitizeMessage(change.title);
  const commitMessage = `${change.type}: ${message} ${SELF_GROW_TAG}`;
  const files = change.files.map((file) => file.path);

  run("git", ["checkout", "-b", branch]);
  run("git", ["add", "--", ...files]);
  run("git", ["commit", "-m", commitMessage]);
  run("git", ["push", "-u", "origin", branch], { stdio: "inherit" });

  return { branch, message, commitMessage };
}

function createPullRequest(change, branchInfo, validation) {
  const ghAvailable = tryRun("gh", ["--version"]);
  if (!ghAvailable.ok) {
    console.log("GitHub CLI is not installed. Branch pushed without PR creation.");
    return null;
  }

  const auth = tryRun("gh", ["auth", "status"]);
  if (!auth.ok) {
    console.log("GitHub CLI is not authenticated. Branch pushed without PR creation.");
    return null;
  }

  const title = `${SELF_GROW_TAG} ${change.type}: ${branchInfo.message}`;
  const body = `Generated by:
- Engine: Local Ollama
- Model: ${OLLAMA_MODEL}
- Runner: self-hosted Windows runner
- Author account: ${AUTHOR_NAME} <${AUTHOR_EMAIL}>

Change summary:
- ${change.summary}

Validation:
- ${validation.lint}
- ${validation.build}

Safety:
- No secrets changed
- No direct main push
- Max 3 files changed
- Generated through scripts/self-grow.mjs
`;

  const pr = run("gh", ["pr", "create", "--base", "main", "--head", branchInfo.branch, "--title", title, "--body", body]);
  const prUrl = pr.split(/\r?\n/).find((line) => line.startsWith("http")) ?? pr;

  const labels = tryRun("gh", ["pr", "edit", prUrl, "--add-label", "self-grow,qwen3,automated-change"]);
  if (!labels.ok) {
    console.log("PR labels were not applied. Continuing without labels.");
  }

  if (ENABLE_AUTO_MERGE) {
    const checks = tryRun("gh", ["pr", "checks", prUrl, "--watch", "--required"]);
    if (checks.ok) {
      const merge = tryRun("gh", ["pr", "merge", prUrl, "--squash", "--delete-branch"]);
      if (!merge.ok) console.log(`Auto-merge failed: ${merge.stderr || merge.stdout}`);
    } else {
      console.log(`Required checks did not pass. Auto-merge skipped: ${checks.stderr || checks.stdout}`);
    }
  } else {
    console.log(`Auto-merge disabled. PR: ${prUrl}`);
  }

  return prUrl;
}

async function main() {
  ensureGitIdentity();
  assertRepoReady();
  const context = collectContext();
  await assertOllamaModel();

  const change = await generateChange(context);
  validateChange(change);

  const snapshots = applyFiles(change.files);
  const validation = runValidationOrRestore(snapshots);
  const branchInfo = createBranchCommitAndPush(change);
  const prUrl = createPullRequest(change, branchInfo, validation);

  console.log(JSON.stringify({ branch: branchInfo.branch, commit: branchInfo.commitMessage, prUrl }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

