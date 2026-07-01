import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, posix, resolve, sep } from "node:path";
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
const ALLOWED_DIFF_PATHS = ["src", "docs", "README.md", "package.json", "public", "app", "components"];
const FORBIDDEN_PATHS = [".env", "package-lock.json"];
const FORBIDDEN_PREFIXES = [".git/", "node_modules/", ".next/", ".vercel/"];
const MAX_GENERATE_ATTEMPTS = 3;
const MAX_REPAIR_ATTEMPTS = 2;
const RAW_RESPONSE_LOG_LIMIT = 1800;
const FAILURE_LOG_LIMIT = 5000;
const DIFF_LOG_LIMIT = 7000;
const SRC_APP_PAGE = "src/app/page.tsx";
const ROOT_APP_PAGE = "app/page.tsx";

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

function runCapture(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });

  return {
    ok: result.status === 0,
    command: `${command} ${args.join(" ")}`,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
  };
}

function tryRun(command, args) {
  const result = runCapture(command, args);
  return {
    ok: result.ok,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
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

function resetToCleanBaseline() {
  run("git", ["reset", "--hard"], { stdio: "inherit" });
  run("git", ["clean", "-fd"], { stdio: "inherit" });
  const status = run("git", ["status", "--short"]);
  if (status) {
    throw new Error(`working tree is not clean after rollback:\n${status}`);
  }
  return status;
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

function summarizeContext(context) {
  return {
    projectStructure: projectStructureSummary(),
    branch: context.branch,
    recentCommits: context.recentCommits,
    packageScripts: context.packageScripts,
    srcTree: context.srcTree,
    appTree: context.appTree,
    docsTree: context.docsTree,
    openPullRequests: context.openPullRequests,
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

function projectStructureSummary() {
  return {
    router: "Next.js App Router",
    sourceLayout: existsSync(resolve(ROOT, "src/app")) ? "src/app" : "app",
    homePage: existsSync(resolve(ROOT, SRC_APP_PAGE)) ? SRC_APP_PAGE : ROOT_APP_PAGE,
    rootAppDirectoryExists: existsSync(resolve(ROOT, "app")),
    srcAppDirectoryExists: existsSync(resolve(ROOT, "src/app")),
    instruction: "Use src/app/page.tsx for the home page. Create new routes under src/app/<route>/page.tsx.",
  };
}

function projectStructureRulesText() {
  return `Project structure rules:
- This repository uses the src/app based Next.js App Router structure.
- Use src/app/page.tsx for the existing home page.
- Do not create or update app/page.tsx when src/app/page.tsx exists.
- Do not modify app/** unless the app directory already exists in the repository.
- Create new pages as src/app/<route>/page.tsx.
- The existing home page is src/app/page.tsx.`;
}

function importRulesText() {
  return `Import rules:
- Prefer zero imports.
- For generated pages, avoid importing custom components or custom types.
- If you create a component and import it, both files must be included in the same JSON proposal.
- Do not import from @/src/*.
- Do not include .tsx extensions in imports.
- For a simple page, define all types and data inline.`;
}

function safetyRulesText() {
  return `Safety rules:
- Make only one small change.
- Modify at most 3 files.
- Do not create or modify secrets, .env files, tokens, or API keys.
- Do not request a GitHub token or API key.
- Do not add external dependencies unless truly necessary.
- Keep the project buildable.
- Do not delete files.
- Only use create or update actions.
- Do not use markdown.
- Do not wrap in code fences.
- Return a single JSON object only.
- No comments.
- No trailing commas.
- Every file content must be a JSON string.
- Escape newlines as needed through JSON serialization.`;
}

function schemaText() {
  return `JSON shape:
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
}`;
}

function allowedPathsText() {
  return `Allowed paths:
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
- package-lock.json`;
}

function buildPrompt(context, attempt = 1) {
  return `You are the local AI growth engine for this repository.

Core instruction:
Look at the current repo state and failure logs, then independently decide one small change that moves this project to its next step. What to build is your decision. The change must actually build in the current repo.

Do not wait for a human product direction, feature direction, service idea, design preference, or marketing angle. Choose the change yourself from the current repository state.

${safetyRulesText()}

${projectStructureRulesText()}

${importRulesText()}

${allowedPathsText()}

${schemaText()}

${attempt > 1 ? "Your previous response was invalid JSON. Return only valid JSON matching the schema.\n\n" : ""}Repository context:
${JSON.stringify(context, null, 2)}
`;
}

function buildRepairPrompt({
  context,
  previousProposal,
  failure,
  diff,
  repairAttempt,
  jsonAttempt,
  previousFailures,
}) {
  return `Your previous change failed validation.
Analyze the error log and return a corrected JSON proposal.
Do not explain.
Return only valid JSON.
The new proposal must be self-contained.
Do not reference files, types, aliases, or components that do not exist.
If a type is needed, define it in the same file.
Keep the change small.
Max 3 files.
No secrets.
No .env changes.
Do not use markdown.
Do not wrap in code fences.
Return a single JSON object only.
No comments.
No trailing commas.
Every file content must be a JSON string.
Escape newlines as needed through JSON serialization.

Repair attempt: ${repairAttempt}
Previous failed pattern memory:
${formatPreviousFailures(previousFailures)}

${jsonAttempt > 1 ? "Your previous response was invalid JSON. Return only valid JSON matching the schema.\n\n" : ""}
Previous proposal title: ${previousProposal.title}
Previous proposal summary: ${previousProposal.summary}
Failed command: ${failure.command}
stdout excerpt:
${truncateForLimit(failure.stdout ?? "", FAILURE_LOG_LIMIT)}

stderr excerpt:
${truncateForLimit(failure.stderr ?? "", FAILURE_LOG_LIMIT)}

Combined error log excerpt:
${truncateForLimit(failure.log, FAILURE_LOG_LIMIT)}

Current diff excerpt:
${truncateForLimit(diff || "No diff was available.", DIFF_LOG_LIMIT)}

Repo context summary:
${JSON.stringify(summarizeContext(context), null, 2)}

${safetyRulesText()}

${projectStructureRulesText()}

${importRulesText()}

${allowedPathsText()}

${schemaText()}
`;
}

function formatPreviousFailures(previousFailures) {
  if (!previousFailures.length) return "- None yet.";
  return previousFailures
    .map((failure) => [
      `- Attempt ${failure.attempt}: ${failure.reason}`,
      ...failure.bannedPatterns.map((pattern) => `  - ${pattern}`),
    ].join("\n"))
    .join("\n");
}

function rememberFailure(memory, attempt, proposal, failure) {
  const patterns = deriveBannedPatterns(proposal, failure);
  memory.previousFailures.push({
    attempt,
    reason: `${failure.command}: ${firstLine(failure.log)}`,
    bannedPatterns: patterns,
  });
}

function deriveBannedPatterns(proposal, failure) {
  const patterns = new Set();
  const log = failure.log ?? "";

  if (log.includes("@/src/")) {
    patterns.add("Do not use @/src/* imports.");
    for (const match of log.matchAll(/@\/src\/[^\s'"`]+/g)) patterns.add(`Do not use ${match[0]}`);
  }
  if (/\.tsx(?:\s|$|;|,)/i.test(log)) patterns.add("Do not include .tsx extensions in imports.");
  if (log.includes(ROOT_APP_PAGE)) patterns.add(`Do not create or update ${ROOT_APP_PAGE}; use ${SRC_APP_PAGE}.`);
  if (/missing (?:aliased|relative) import/.test(log)) {
    patterns.add("Do not import files that are not included in this JSON proposal.");
    patterns.add("Prefer zero imports and define simple page data inline.");
  }

  for (const file of proposal.files) {
    if (file.path.startsWith("app/")) patterns.add("Do not use app/** paths in this repo; use src/app/**.");
  }

  return [...patterns];
}

function firstLine(value) {
  return String(value ?? "").split(/\r?\n/).find(Boolean) ?? "No failure detail captured.";
}

async function generateInitialProposal(context) {
  return generateProposal((attempt) => buildPrompt(context, attempt), "initial proposal");
}

async function generateRepairProposal(repairInput) {
  return generateProposal((attempt) => buildRepairPrompt({ ...repairInput, jsonAttempt: attempt }), `repair proposal ${repairInput.repairAttempt}`);
}

async function generateProposal(promptFactory, label) {
  let lastError = null;
  let lastRawResponse = "";

  for (let attempt = 1; attempt <= MAX_GENERATE_ATTEMPTS; attempt += 1) {
    const rawResponse = await requestOllama(promptFactory(attempt));
    lastRawResponse = rawResponse;
    logRawResponse(rawResponse, `${label} / JSON attempt ${attempt}`);

    try {
      const change = parseJsonResponse(rawResponse);
      validateChange(change);
      return change;
    } catch (error) {
      lastError = error;
      console.log(`Ollama response for ${label} attempt ${attempt} was invalid: ${formatError(error)}`);
      if (attempt < MAX_GENERATE_ATTEMPTS) {
        console.log("Retrying with stricter JSON instructions.");
      }
    }
  }

  throw new Error(
    `Ollama did not return valid self-grow JSON for ${label} after ${MAX_GENERATE_ATTEMPTS} attempts. Last error: ${formatError(
      lastError,
    )}\nRaw response excerpt:\n${truncateForLog(lastRawResponse)}`,
  );
}

async function requestOllama(prompt) {
  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
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

function logRawResponse(rawResponse, label) {
  console.log(`Ollama raw response excerpt (${label}):`);
  console.log(truncateForLog(rawResponse));
}

function truncateForLog(value) {
  return truncateForLimit(value, RAW_RESPONSE_LOG_LIMIT);
}

function truncateForLimit(value, limit) {
  const text = String(value ?? "").replace(/\r/g, "");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n... [truncated ${text.length - limit} chars]`;
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
  if (path === ROOT_APP_PAGE && existsSync(resolve(ROOT, SRC_APP_PAGE))) {
    throw new Error(`hard banned path: ${ROOT_APP_PAGE}; this repository uses ${SRC_APP_PAGE}`);
  }
  if (path.startsWith("app/") && !existsSync(resolve(ROOT, "app"))) {
    throw new Error(`hard banned path: ${path}; root app directory does not exist, use src/app instead`);
  }
  if (FORBIDDEN_PATHS.includes(path)) throw new Error(`forbidden path: ${path}`);
  if (FORBIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix))) throw new Error(`forbidden path: ${path}`);

  const isAllowed = ALLOWED_ROOT_FILES.has(path) || ALLOWED_DIRS.some((prefix) => path.startsWith(prefix));
  if (!isAllowed) throw new Error(`path is not allowed: ${path}`);
}

function preflightProposal(change) {
  validateChange(change);
  validateImports(change);
}

function validateImports(change) {
  const generatedPaths = new Set(change.files.map((file) => file.path));
  const packageNames = getPackageNames();
  const importPattern = /(?:^|\n)\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;

  for (const file of change.files) {
    importPattern.lastIndex = 0;
    let match = importPattern.exec(file.content);
    while (match) {
      const specifier = match[1];
      if (specifier.startsWith("@/src/")) {
        throw new Error(`hard banned import in ${file.path}: ${specifier}; do not import from @/src/*`);
      }
      if (/\.tsx$/i.test(specifier)) {
        throw new Error(`hard banned import in ${file.path}: ${specifier}; do not include .tsx extensions in imports`);
      }
      if (specifier.startsWith("@/")) {
        const target = normalizeRepoPath(`src/${specifier.slice(2)}`);
        if (!modulePathExists(target, generatedPaths)) {
          throw new Error(`missing aliased import in ${file.path}: ${specifier}`);
        }
      } else if (specifier.startsWith(".")) {
        const target = normalizeRepoPath(posix.normalize(posix.join(posix.dirname(file.path), specifier)));
        if (!modulePathExists(target, generatedPaths)) {
          throw new Error(`missing relative import in ${file.path}: ${specifier}`);
        }
      } else {
        validateExternalImport(file.path, specifier, packageNames);
      }
      match = importPattern.exec(file.content);
    }
  }
}

function getPackageNames() {
  const packageJson = JSON.parse(readText(resolve(ROOT, "package.json")) || "{}");
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
}

function validateExternalImport(filePath, specifier, packageNames) {
  if (specifier.startsWith("node:")) return;
  const packageName = packageNameFromSpecifier(specifier);
  if (!packageNames.has(packageName)) {
    throw new Error(`external import not listed in package.json in ${filePath}: ${specifier}`);
  }
}

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return `${scope}/${name ?? ""}`;
  }
  return specifier.split("/")[0];
}

function modulePathExists(basePath, generatedPaths) {
  return modulePathCandidates(basePath).some((candidate) => generatedPaths.has(candidate) || existsSync(resolve(ROOT, candidate)));
}

function modulePathCandidates(basePath) {
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css"];
  const candidates = [];
  for (const extension of extensions) candidates.push(`${basePath}${extension}`);
  for (const extension of extensions.slice(1)) candidates.push(`${basePath}/index${extension}`);
  return candidates.map(normalizeRepoPath);
}

function applyFiles(files) {
  for (const file of files) {
    const absolute = resolve(ROOT, file.path);
    if (!absolute.startsWith(ROOT + sep)) throw new Error(`resolved path escaped repo: ${file.path}`);

    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.content, "utf8");
  }
}

function runValidation() {
  const lint = runValidationCommand("npm", ["run", "lint"]);
  if (!lint.ok) return lint;

  const build = runValidationCommand("npm", ["run", "build"]);
  if (!build.ok) return build;

  return {
    ok: true,
    lint: "npm run lint: passed",
    build: "npm run build: passed",
  };
}

function runValidationCommand(command, args) {
  const commandName = `${command} ${args.join(" ")}`;
  console.log(`Running ${commandName}`);
  const result = runCapture(command, args);
  if (result.ok) {
    console.log(`${commandName} passed`);
    return { ok: true, command: commandName };
  }

  console.log(`${commandName} failed`);
  return {
    ok: false,
    command: commandName,
    stdout: result.stdout,
    stderr: result.stderr,
    log: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
    status: result.status,
  };
}

function collectAllowedDiff() {
  const diff = tryRun("git", ["diff", "--", ...ALLOWED_DIFF_PATHS]);
  return diff.stdout || diff.stderr || "";
}

function proposalFileList(change) {
  return change.files.map((file) => `${file.action}:${file.path}`).join(", ");
}

async function runProposalWithRepair(context) {
  let proposal = await generateInitialProposal(context);
  let lastFailure = null;
  let totalAttempts = 0;
  let lastProposalTitle = proposal.title;
  const memory = {
    previousFailures: [],
  };

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
    const isRepair = attempt > 0;
    const attemptLabel = isRepair ? `repair attempt ${attempt}` : "initial attempt";
    totalAttempts += 1;
    lastProposalTitle = proposal.title;
    console.log(`Self-grow ${attemptLabel}`);
    console.log(`Proposal: ${proposal.type}: ${proposal.title}`);
    console.log(`Files: ${proposalFileList(proposal)}`);

    resetToCleanBaseline();

    try {
      preflightProposal(proposal);
    } catch (error) {
      lastFailure = {
        command: "preflight",
        stdout: "",
        stderr: formatError(error),
        log: formatError(error),
      };
      console.log(`preflight failed: ${lastFailure.log}`);
      rememberFailure(memory, attempt + 1, proposal, lastFailure);

      if (attempt === MAX_REPAIR_ATTEMPTS) break;
      proposal = await generateRepairProposal({
        context,
        previousProposal: proposal,
        failure: lastFailure,
        diff: "No diff was available because preflight failed before file application.",
        repairAttempt: attempt + 1,
        previousFailures: memory.previousFailures,
      });
      continue;
    }

    applyFiles(proposal.files);
    const validation = runValidation();
    if (validation.ok) {
      console.log("self-grow validation passed");
      return { change: proposal, validation };
    }

    const diff = collectAllowedDiff();
    lastFailure = validation;
    rememberFailure(memory, attempt + 1, proposal, lastFailure);

    if (attempt === MAX_REPAIR_ATTEMPTS) break;

    console.log(`Preparing repair attempt ${attempt + 1}`);
    proposal = await generateRepairProposal({
      context,
      previousProposal: proposal,
      failure: validation,
      diff,
      repairAttempt: attempt + 1,
      previousFailures: memory.previousFailures,
    });
  }

  const statusAfterRollback = finalizeFailedRun({
    failure: lastFailure,
    memory,
    totalAttempts,
    lastProposalTitle,
  });
  throw new Error(
    `self-grow failed after ${MAX_REPAIR_ATTEMPTS} repair attempts. Total attempts: ${totalAttempts}. Last proposal: ${lastProposalTitle}. Last failure: ${lastFailure?.command ?? "unknown"}\n${truncateForLimit(
      lastFailure?.log ?? "No failure log captured.",
      FAILURE_LOG_LIMIT,
    )}\nGit status after rollback:\n${statusAfterRollback || "clean"}`,
  );
}

function finalizeFailedRun({ failure, memory, totalAttempts, lastProposalTitle }) {
  console.log("Final self-grow failure. Rolling back all generated changes.");
  resetToCleanBaseline();
  const status = run("git", ["status", "--short"]);
  console.log(`total attempts: ${totalAttempts}`);
  console.log(`failed patterns:
${formatPreviousFailures(memory.previousFailures)}`);
  console.log(`banned paths/imports:
${formatPreviousFailures(memory.previousFailures)}`);
  console.log(`last proposal title: ${lastProposalTitle}`);
  console.log(`rollback status:
${status || "clean"}`);
  console.log(`git status --short after rollback:
${status || "clean"}`);
  console.log(`raw failure summary:
${truncateForLimit(failure?.log ?? "No failure log captured.", FAILURE_LOG_LIMIT)}`);
  return status;
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

  console.log(`Branch: ${branch}`);
  console.log(`Commit: ${commitMessage}`);
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
    console.log("ENABLE_AUTO_MERGE=true is set, but self-grow keeps auto-merge disabled by policy. PR only.");
  }

  console.log(`PR URL: ${prUrl}`);
  console.log(`Auto-merge disabled. PR: ${prUrl}`);
  return prUrl;
}

async function main() {
  ensureGitIdentity();
  assertRepoReady();
  const context = collectContext();
  await assertOllamaModel();

  const { change, validation } = await runProposalWithRepair(context);
  const branchInfo = createBranchCommitAndPush(change);
  const prUrl = createPullRequest(change, branchInfo, validation);

  console.log(JSON.stringify({ branch: branchInfo.branch, commit: branchInfo.commitMessage, prUrl }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
