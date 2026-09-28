# SpawnZero Agent Guide

이 파일은 이 저장소의 기준 문서(standards layer)다. 어떤 모델, 어떤 도구든
코드를 건드리기 전에 이 파일을 끝까지 읽는다. 여기 적힌 규칙은 요청에도
구속력이 있다.

- 작업 방식: `docs/agents/method.md`. 첫 변경 전에 읽는다.
- 답변 규율(근거 라벨, 판단을 바꿔도 되는 조건): `docs/agents/answer-discipline.md`.
  모든 답변과 보고에 적용된다. `CLAUDE.md`가 import하므로 Claude Code 세션에는
  자동으로 로드되고, 다른 도구는 세션 시작 시 읽는다.
- 스키마·저장 형식 변경: `docs/agents/schema-evolution.md`. 컬럼, 필드, 테이블을
  건드리기 전에 읽는다.
- 현재 구현 현황(이미 있는 것): `docs/agents/inventory.md`
- 단계별 절차(도구 중립): `docs/agents/checklists/`
- 이미 내린 판단과 그 이유: `docs/agents/decisions/`
- Claude Code 스킬 래퍼: `.claude/skills/`

규칙 끝의 `(unverified)`는 코드·git 이력·README·docs로 확인하지 못해 오너
확인을 기다리는 규칙이라는 뜻이다. 따르되, 코드와 어긋나면 멈추고 보고한다.

## Product Purpose

- SpawnZero는 로컬 AI 모델이 최소한의 Next.js 기반에서 출발해 프로젝트를 한
  번에 작은 변경 하나씩 키우는 공개 실험이다. (README.md, docs/experiment-rules.md)
- 사람의 역할은 안전한 실행 환경 제공, PR 리뷰, 머지 결정이다. 무엇을 만들지는
  로컬 모델(Ollama의 `qwen3:8b`)이 정한다.
- 성장 엔진은 `scripts/self-grow.mjs`(`npm run grow`)다. 저장소 문맥을 읽어
  모델에 보내고, 응답(JSON)을 검증하고, lint·build를 통과하면 `auto/grow-*`
  브랜치에 커밋해 push하고 PR을 연다.
- 이 저장소는 제품이 아니다. 사람이 정한 서비스 아이디어, 기능 로드맵, 디자인
  취향, 마케팅 문구를 구현하는 곳이 아니다. (docs/experiment-rules.md "Humans
  should not provide")
- 현재 웹 화면은 비어 있다. `src/app/page.tsx`의 `Home`은 `null`을 반환한다.
  사람이 만든 랜딩 페이지는 의도적으로 지웠다(아래 "안 하기로 한 것").
- 공개 저장소다. (README.md "Public repo safety", docs/self-hosted-runner.md)

## Domain Principles

- 사람(에이전트 포함)은 self-grow 모델에게 방향을 주지 않는다. `buildPrompt`,
  `buildRepairPrompt`의 프롬프트에 서비스 아이디어, 주제 선호·금지, 디자인
  취향, "SpawnZero와 관련된 것을 하라" 같은 문장을 넣지 않는다. (이유: 실험의
  관찰 대상이 "모델이 스스로 무엇을 고르는가"다. 04ed73b, cc0b2f2에서 이런
  문장과 blog 주제 금지를 일부러 뺐다. `docs/agents/decisions/0002-no-human-direction-in-prompt.md`)
- 사람이 `src/app/`에 화면 내용이나 디자인을 추가하지 않는다. (이유: 모델이
  출발하는 기준점이 "빈 상태"여야 한다. fb69af3, cc0b2f2.
  `docs/agents/decisions/0003-blank-home-page.md`)
- 프롬프트 안의 금지 규칙은 방향 제시가 아니라 안전·빌드 가능성을 위한 것만
  둔다. 현재 `safetyRulesText`, `projectStructureRulesText`, `importRulesText`,
  `allowedPathsText`, `schemaText`가 그 범위다. 예외: `safetyRulesText`의
  "generic contact, pricing, careers, or testimonials pages" 금지와 "fake
  contact or business content" 금지는 cc0b2f2에서 오너가 넣은 것이다.
  이것을 지우거나 비슷한 주제 금지를 더하는 것은 오너 확인 대상이다.
- self-grow의 실행 검증은 모델을 믿지 않고 코드로 막는다. 경로 허용 목록,
  import 검사, 파일 수 상한은 프롬프트 문장이 아니라 `validateChange`,
  `validatePath`, `validateImports`가 강제한다. 프롬프트에만 있고 코드 검사가
  없는 금지는 지켜진다고 가정하지 않는다.
  (`docs/agents/decisions/0004-preflight-and-repair-loop.md`)

### 기본 문구 규칙 (baseline 공통, 부트스트랩 시 삭제하지 말 것)

- 한국어 사용자 노출 텍스트에 em-dash(—)와 en-dash(–)를 쓰지 않는다. UI
  카피, 에러 메시지, README 등 문서, 그리고 LLM이 생성해 사용자에게
  보여주는 출력 전부가 대상이다. 쉼표, 마침표, 콜론, 괄호, 가운뎃점(·)으로
  풀어 쓴다. (이유: 대시 삽입은 영어 문체의 직역이라 한국어에서 즉시 AI
  생성 티가 난다. 여러 프로젝트에서 반복 발생해 기본 규칙으로 박제함.)
- LLM 프롬프트로 사용자 노출 텍스트를 생성하는 경우, 그 프롬프트에도 같은
  금지를 명시한다. (규칙이 프롬프트 층까지 내려가야 모델 출력이 지킨다.)
- 검증: 릴리스 전 사용자 노출 문자열과 한국어 문서에 대해
  `grep -rn "—\|–"` 실행 결과가 0건이어야 한다. 영어 산문과 코드 주석은
  예외다.
- 이 저장소 적용 메모: 현재 사용자 노출 텍스트는 영어다(`src/app/layout.tsx`의
  `<html lang="en">`, README.md). self-grow 프롬프트에 이 금지를 넣는 것은 위
  "방향을 주지 않는다" 원칙과 부딪칠 수 있으므로 오너 확인 전에 넣지 않는다.
  (unverified)

### 한국어 줄바꿈 (baseline 공통, 부트스트랩 시 삭제하지 말 것)

- 웹 화면의 전역 스타일에 아래를 넣는다. 브라우저 기본값은 한국어를 글자
  단위로 끊어서 "상품은 하 / 위가 없는", "확인하세 / 요." 처럼 낱말 중간이
  갈라진다. 화면을 다 만든 뒤에야 눈에 띄고, 그때는 문구를 하나씩 고치게
  된다. 시작할 때 넣는다.

  ```css
  body {
    word-break: keep-all;      /* 띄어쓰기에서만 끊는다 */
    overflow-wrap: break-word; /* 끊을 곳 없는 긴 URL 만 강제로 넘긴다 */
  }

  h1, h2, h3, p {
    text-wrap: pretty;         /* 마지막 줄에 한 낱말만 남는 것을 피한다 */
  }
  ```

- 좁은 칸에 긴 설명을 넣지 않는다. 2단 배치 안의 도움말은 접혀서 읽기
  어려워진다. 설명이 한 줄을 넘으면 칸을 나누지 말고 폭을 준다.
- 이 저장소 적용 메모: 현재 `src/app/globals.css`에는 위 규칙이 없다. 한국어
  화면이 없고, 사람이 전역 스타일을 넣는 것은 실험 규칙(사람은 디자인 취향을
  주지 않는다)과 충돌할 수 있다. 오너 확인 전에 넣지 않는다. (unverified)

### 화면 용어 (baseline 공통, 부트스트랩 시 삭제하지 말 것)

- DB 표 이름과 컬럼 이름을 화면에 그대로 쓰지 않는다. `listing`, `slug`,
  `intro_text`, `draft`, `published` 같은 말이 화면에 나오면 사용자는 그것이
  무엇인지 알 수 없다. 화면에는 사람이 쓰는 말을 쓰고, 상태값도 한국어로
  옮긴다.
- 같은 것을 두 낱말로 부르지 않는다. 한국어에서 구분되지 않는 낱말(상품과
  제품, 등록과 추가)을 서로 다른 뜻으로 쓰면 사용자는 두 번 만들라는
  뜻으로 읽는다. 화면에서 쓰는 명사를 먼저 정하고 그 목록을 고정한다.
- 검증: 사용자 노출 문자열에 DB 식별자가 남아 있지 않은지 화면을 실제로
  렌더링해서 확인한다. 소스 grep 만으로는 놓친다.

## Hard Rules

- 비밀값, 토큰, API 키, `.env` 파일을 커밋하지 않는다. 저장소에 들어가는
  환경 파일은 `.env.example`뿐이다. (이유: 공개 저장소. README.md,
  `.gitignore`의 `.env*` / `!.env.example`)
- 에이전트는 `.env`류 파일을 열지 않는다. `.env.example`의 값도 문서로 옮기지
  않는다.
- `npm run grow`(`scripts/self-grow.mjs`)를 에이전트가 오너 확인 없이 실행하지
  않는다. (이유: `main`에서만 돌고, 시도마다 `resetToCleanBaseline`이
  `git reset --hard`와 `git clean -fd`를 실행하고, `ensureGitIdentity`가 로컬
  git 설정의 user.name·user.email을 덮어쓰고, 성공하면
  `createBranchCommitAndPush`가 origin에 push하고 `createPullRequest`가 공개
  PR을 연다.)
- self-grow가 만든 변경은 `main`에 직접 push하지 않는다. 항상
  `auto/grow-YYYYMMDD-HHmm` 브랜치와 PR로 낸다. (`createBranchCommitAndPush`,
  `createPullRequest`의 `--base main`. README.md, docs/experiment-rules.md)
- 자동 머지를 되살리지 않는다. `createPullRequest`는 `ENABLE_AUTO_MERGE=true`여도
  로그만 남기고 머지하지 않는다. `gh pr merge` 호출은 3df60cc에서 제거됐다.
  (이유: 사람이 머지 전에 결과를 검토하는 것이 실험 규칙이다.
  `docs/agents/decisions/0001-auto-merge-disabled.md`)
- AI 생성은 GitHub 호스티드 러너에서 돌리지 않는다. `.github/workflows/self-grow.yml`의
  `runs-on: self-hosted`와 `workflow_dispatch` 트리거를 바꾸지 않는다.
  (이유: 로컬 Ollama가 필요하고, 워크플로 첫 줄 주석과
  docs/self-hosted-runner.md가 금지한다.
  `docs/agents/decisions/0006-self-hosted-runner-only.md`)
- self-grow 한 번에 바뀌는 파일은 3개 이하다. `validateChange`가 강제한다. 이
  상한을 올리지 않는다. (docs/experiment-rules.md "Change at most 3 files per run")
- self-grow 제안의 `action`은 `create`와 `update`뿐이다. 파일 삭제를 허용하지
  않는다. (`validateChange`, `safetyRulesText`의 "Do not delete files")
- self-grow가 쓸 수 있는 경로 허용 목록(`ALLOWED_ROOT_FILES`, `ALLOWED_DIRS`)에
  `scripts/`, `.github/`, `.env*`, `package-lock.json`, 루트 설정 파일을 넣지 않는다.
  (이유: 모델이 자기 검증기와 CI, 비밀값, 잠금 파일을 고칠 수 있게 된다.
  `FORBIDDEN_PATHS`, `FORBIDDEN_PREFIXES`) (unverified: 이 목록은 코드 현재 상태에서
  읽은 것이고, 오너가 "넣지 않는다"를 명시한 적은 없다)
- lint나 build가 실패한 제안은 커밋하지 않는다. `runValidation`이 실패하면
  `runProposalWithRepair`가 되돌리고 수리 시도로 넘어간다.
  (docs/experiment-rules.md "Do not commit if lint or build fails")
- 사람(에이전트 포함)의 변경도 `main`에 직접 push하지 않고 PR로 낸다.
  (unverified: README.md는 "Direct pushes to `main` are reserved for the initial
  bootstrap only"라고 쓰지만, git 이력의 e4bee56부터 cc0b2f2까지 사람 커밋이
  PR 없이 `main`에 있다. 어느 쪽이 현재 규칙인지 오너 확인 필요)

### 스키마·저장 형식 (baseline 공통, 부트스트랩 시 삭제하지 말 것)

- 스키마와 저장 형식의 변경은 `docs/agents/schema-evolution.md`를 따른다.
  넓히는 것은 즉시, 줄이는 것은 두 릴리스 뒤다.
- **컬럼·필드 삭제, 이름 변경, 타입 변경은 금지.** 배포는 순차적이라 코드와
  스키마가 어긋나는 순간이 반드시 있고, 롤백은 코드만 되돌린다. 필요하면
  확장-축소 3단계로 나누고, 축소 단계는 사람에게 확인받는다.
- 새 컬럼은 **nullable이거나 default가 있어야** 한다. 기존 행과 기존 코드가
  그 컬럼을 몰라도 돌아가야 한다.
- **이미 적용된 마이그레이션은 수정하지 않는다.** 새 파일을 하나 더 만든다.
- 이 규칙에는 검증 장치가 붙어 있어야 한다(금지 구문 검사 등). 어느 명령이
  그것을 확인하는지 Quality Bar에 적는다.
- 이 저장소 적용 메모: 현재 DB, ORM, 마이그레이션 파일이 없다. 저장 형식에
  해당하는 것은 self-grow 제안 JSON(`schemaText`, `validateChange`)뿐이다. 그
  필드(`title`, `type`, `summary`, `files[].path`, `files[].action`,
  `files[].content`)를 바꾸면 프롬프트와 검증기를 같은 커밋에서 바꾼다.

### 안 하기로 한 것 (다시 제안하지 않는다)

각 항목의 근거와 기각한 대안은 `docs/agents/decisions/`에 있다. 다시 하자는
요청을 받으면 구현하지 말고 오너에게 이 결정과 충돌한다고 알린다.

- 자동 머지. `ENABLE_AUTO_MERGE`는 읽히지만 머지하지 않는다. (0001, 3df60cc)
- self-grow 프롬프트의 프로젝트 철학 문장, "SpawnZero 관련 변경을 선호하라",
  blog 주제 금지(`bannedProposalTopics`, `hasBlogTopic`). (0002, 04ed73b, cc0b2f2)
- 사람이 만든 랜딩 페이지(상태 카드, GitHub 링크, 다크 그라디언트 배경).
  `Home`은 `null`을 반환한다. (0003, fb69af3, cc0b2f2)
- GitHub 호스티드 러너에서의 AI 생성. (0006, `.github/workflows/self-grow.yml`)
- self-grow 제안의 파일 삭제 동작, 3개 초과 파일 변경, `main` 직접 push.
- self-grow의 `app/` 루트 디렉터리 사용(`app/page.tsx`). 이 저장소는
  `src/app/`을 쓴다. (0004, bf2caef)

## Quality Bar

- 완료 조건: `npm run lint`와 `npm run build`가 둘 다 통과한다. CI
  (`.github/workflows/ci.yml`, job `validate`, Node 22, `npm ci` 후 lint, build)가
  모든 push와 PR에서 같은 두 명령을 돌린다. self-grow도 `runValidation`에서 같은
  두 명령을 쓴다.
- 테스트 스위트는 없다(`package.json`에 `test` 스크립트 없음, 테스트 파일 없음).
  "테스트 통과"라고 보고하지 않는다.
- `scripts/self-grow.mjs`를 바꾸면 `docs/agents/checklists/self-grow-change.md`를
  따른다. `npm run build`는 이 스크립트를 검사하지 않는다.
- 보고 형식은 `docs/agents/method.md` 10절을 따른다. 실행하지 못한 검증은
  `(미검증)`과 이유를 쓴다.
- 스키마 금지 구문 검사: 해당 없음(DB·마이그레이션 없음).

## File Structure

- `scripts/self-grow.mjs`: 성장 엔진 전체. 진입점 `main`. 프롬프트
  (`buildPrompt`, `buildRepairPrompt`와 `*RulesText` 함수들), 검증
  (`validateChange`, `validatePath`, `validateImports`, `preflightProposal`),
  실행·수리 루프(`runProposalWithRepair`), git·PR(`createBranchCommitAndPush`,
  `createPullRequest`)이 한 파일에 있다.
- `.github/workflows/self-grow.yml`: self-grow 실행 워크플로(수동 실행, self-hosted).
- `.github/workflows/ci.yml`: lint·build 검증.
- `src/app/layout.tsx`: `RootLayout`, `metadata`(title "SpawnZero"), Geist 폰트.
- `src/app/page.tsx`: `/` 라우트. `Home`이 `null` 반환.
- `src/app/globals.css`: Tailwind v4 import, `--background`/`--foreground` 토큰.
- `docs/experiment-rules.md`: 실험 규칙의 원본(사람 역할, 모델 역할, 안전 규칙,
  초기 관찰 기간). 안전 규칙을 바꾸면 이 파일과 `safetyRulesText`를 같은
  커밋에서 바꾼다.
- `docs/roadmap.md`, `docs/self-hosted-runner.md`: 단계 계획, 러너 설정 안내.
- `.env.example`: self-grow가 읽는 환경 변수 이름 목록.
- `docs/agents/`: 이 기준 문서 체계. 주의: `docs/`는 self-grow의 `ALLOWED_DIRS`에
  들어 있고 `collectContext`의 `docsTree`로 모델 프롬프트에 목록이 들어간다. 즉
  self-grow 모델이 `docs/agents/` 파일을 읽을 목록으로 보고, 수정 제안도 할 수 있다.

## Escalation Rules

Stop and ask the owner instead of guessing when:

- A change would remove or weaken a guard documented in this file.
- A requested feature conflicts with a documented "removed on purpose"
  decision.
- Money, pricing, legal, or user-data-destructive changes are involved.
- This file contradicts the current code. Report the mismatch; do not
  silently follow either side.
- `npm run grow` 실행, self-grow 워크플로 수동 실행, `auto/grow-*` 브랜치 push,
  PR 생성·머지처럼 공개 저장소에 무언가를 내보내는 동작.
- `scripts/self-grow.mjs`의 프롬프트 문장을 더하거나 빼는 변경. 안전 문장인지
  방향 제시인지는 오너가 판단한다.
- 경로 허용·금지 목록(`ALLOWED_ROOT_FILES`, `ALLOWED_DIRS`, `ALLOWED_DIFF_PATHS`,
  `FORBIDDEN_PATHS`, `FORBIDDEN_PREFIXES`), 파일 수 상한, 재시도 횟수
  (`MAX_GENERATE_ATTEMPTS`, `MAX_REPAIR_ATTEMPTS`) 변경.
- 사람이 `src/app/`에 화면 내용이나 스타일을 넣자는 요청.
- 새 외부 의존성 추가.
- `.github/workflows/`의 `permissions`, `runs-on`, 트리거 변경.

## Standards Maintenance

- This file is only useful while it is accurate. When you change behavior
  that a rule here describes, update that rule in the same commit.
- Rules must be checkable; every prohibition states its reason.
- Record non-obvious judgment calls as decision memos in
  `docs/agents/decisions/` (format in that folder's README). Promote memos
  that generalize into rules here.
- Reusable procedures live in `docs/agents/checklists/` (tool-neutral);
  `.claude/skills/` holds thin Claude Code wrappers. The checklist file is
  the source of truth, not the wrapper.
- The schema-evolution rules have exactly one source:
  `docs/agents/schema-evolution.md`. The Hard Rules entry above is a summary;
  change the source, never the summary alone.
- The answer-discipline rules have exactly one source:
  `docs/agents/answer-discipline.md`. Section 4 of `docs/agents/method.md`
  is a summary of it. Change the source, never the summary alone; if the two
  disagree, the source wins.
- The current-state snapshot is `docs/agents/inventory.md`. It is generated
  from the code, not hand-written. Regenerate it (refresh-inventory) in the
  same change that adds, removes, or renames a screen, user action, background
  job, plan gate, or data-model field. A stale inventory is worse than none: a
  weaker model will believe a feature is missing when it exists.
- In this file and every durable doc under `docs/agents/`, reference code by
  file, function, class, or route name, never by line number. Line numbers rot
  when code shifts and a wrong reference produces a wrong judgment. (Line
  numbers in chat, which are clickable and momentary, are fine.)
- self-grow PR이 머지돼 `src/app/`에 화면이 생기면, 그 PR을 머지한 뒤의 첫
  사람 작업에서 inventory를 재생성한다. self-grow는 `docs/agents/`를 갱신하지
  않는다.

## 오너 인터뷰 대기

이번 설치는 오너 인터뷰 없이 코드·git 이력·README·docs만으로 작성했다. 아래
질문의 답을 받으면 해당 규칙의 `(unverified)`를 지우거나 규칙을 고친다.

반복된 실수

1. self-grow 실행에서 반복해서 실패한 패턴(bf2caef의 import 실패, 38e1bf4의 오류
   캡처 누락 외에)이 더 있나? 그중 코드 검사로 막아야 할 것은?
2. 에이전트(Claude Code, Codex)가 이 저장소에서 반복한 실수가 있나? 예: 빈
   `Home`을 "고치려고" 내용을 채움, 프롬프트에 방향 문장 추가.

일부러 뺀 기능

3. 자동 머지는 영구 제거인가, 관찰 기간(첫 5회) 뒤 되살릴 예정인가? 지금 코드는
   `ENABLE_AUTO_MERGE`를 무시하고, docs/roadmap.md Phase 3과
   docs/experiment-rules.md는 나중에 켤 수 있는 것처럼 쓴다.
4. blog 주제 금지를 뺐는데(04ed73b), cc0b2f2에서 contact·pricing·careers·testimonials
   페이지 금지를 넣었다. 이 둘의 기준은 무엇인가? 주제 금지를 더 넣을 계획이 있나?

완료 기준

5. 사람이 `scripts/self-grow.mjs`를 바꿀 때 lint·build 외에 요구하는 검증이 있나?
   (예: 로컬에서 `npm run grow`를 한 번 돌려 PR 생성까지 확인)
6. self-grow PR을 머지할 때 보는 기준은 무엇인가? (docs/experiment-rules.md의
   "PR title, changed files, and validation output" 외에)

금지선

7. 사람 변경도 PR로만 내야 하나, 사람은 `main`에 직접 커밋해도 되나?
   (README.md와 git 이력이 어긋난다)
8. `docs/agents/`가 self-grow 모델의 컨텍스트(`docsTree`)와 수정 허용 범위
   (`ALLOWED_DIRS`의 `docs/`)에 들어가는 것을 허용하나? 막아야 하면
   `FORBIDDEN_PREFIXES` 변경이 필요하다(이번 작업에서는 코드를 고치지 않았다).
9. 한국어 baseline 규칙(대시 금지, keep-all 줄바꿈)을 이 저장소의 프롬프트나
   전역 CSS에 넣어도 되나, 아니면 "사람은 방향·디자인을 주지 않는다"가 우선인가?
10. `ensureGitIdentity`가 오너 이름·이메일을 하드코딩해 커밋과 공개 PR 본문에
    넣는다. 의도한 것인가?

에스컬레이션 조건

11. 에이전트가 묻지 않고 해도 되는 self-grow 변경의 범위는? (예: 로그 문구, 실패
    유형 분류 `detectFailureType`의 정규식 추가)
12. `.env.example`은 self-grow 설정 파일처럼 보이지만 `npm run grow`는 `.env`를
    읽지 않는다(`dotenv`나 `--env-file` 없음). 설정을 어디서 넣는지(셸 환경 변수,
    러너 환경) 확인이 필요하다.
