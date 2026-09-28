# 0006: AI 생성은 self-hosted 러너에서만, PR 생성 실패는 실행 실패로 보지 않는다

- Date: 2026-07-01
- Area: .github/workflows/self-grow.yml, scripts/self-grow.mjs `createPullRequest`

## Problem

self-grow를 GitHub Actions에서 돌리되, 모델은 로컬 Ollama에만 있고 Actions 토큰 권한이
부족하면 push·PR이 실패했다.

## Approach

1. 639475b부터 `self-grow.yml`은 `runs-on: self-hosted`, 트리거는 `workflow_dispatch`뿐이다.
   첫 줄 주석: "Do not run AI generation on GitHub-hosted runners."
2. 7c04f3f("fix: allow self-grow workflow to push branches"): 워크플로에 `permissions`
   (contents write, pull-requests write, actions read), `persist-credentials: true`,
   `GH_TOKEN`/`GITHUB_TOKEN` 전달을 더하고, docs/self-hosted-runner.md에 저장소 설정 안내를 더함.
3. 같은 커밋: `gh pr create`를 `run`에서 `tryRun`으로 바꿔, PR 생성이 실패해도 예외로
   끝내지 않고 `printManualPullRequestInstructions`로 compare URL을 출력.

## Not done & why

- GitHub 호스티드 러너에서 생성: 로컬 모델이 없고, docs/self-hosted-runner.md가 금지한다.
- PR 생성 실패 시 실행 전체 실패: 브랜치는 이미 push됐으므로 사람이 수동으로 PR을 열 수 있다.

## Reuse rule

`self-grow.yml`의 `runs-on: self-hosted`를 바꾸지 않는다. push 뒤 단계의 실패는 실행 실패로
만들지 말고 수동 대안을 출력한다. AGENTS.md Hard Rules에 올렸다.
