# 0001: 자동 머지를 코드에서 제거하고 PR만 연다

- Date: 2026-07-01
- Area: scripts/self-grow.mjs `createPullRequest`

## Problem

self-grow가 연 PR을 CI 통과 후 자동 머지할지 정해야 했다.

## Approach

1. 639475b(초기 버전)에는 `ENABLE_AUTO_MERGE=true`일 때 `gh pr checks --watch --required`
   후 `gh pr merge --squash --delete-branch`를 부르는 코드가 있었다.
2. 3df60cc("fix: add self-grow repair loop")에서 이 호출을 지웠다. 지금
   `createPullRequest`는 `ENABLE_AUTO_MERGE`가 true여도 "self-grow keeps auto-merge
   disabled by policy. PR only." 로그만 남긴다.
3. PR 본문의 Safety 항목과 README.md "Auto-merge is disabled by default"가 같은 방침이다.

## Not done & why

- 환경 변수로 켜는 자동 머지 유지: docs/experiment-rules.md가 사람이 머지 전에 결과를
  검토해야 한다고 정한다("Humans must be able to review the experiment result before merge").
  플래그 하나로 이 검토가 사라진다.

## Reuse rule

`gh pr merge`나 자동 머지 설정을 self-grow에 다시 넣지 않는다. 필요하면 오너에게 먼저
묻는다. AGENTS.md "안 하기로 한 것"에 올렸다. 영구 제거인지 관찰 기간 한정인지는
오너 확인 대기(AGENTS.md "오너 인터뷰 대기" 3번).
