# 0004: 모델 응답을 코드로 사전 검사하고, 실패는 기록을 붙여 수리 요청한다

- Date: 2026-07-01
- Area: scripts/self-grow.mjs `preflightProposal`, `validatePath`, `validateImports`,
  `runProposalWithRepair`, `rememberFailure`, `deriveBannedPatterns`

## Problem

모델(qwen3:8b)이 없는 파일 import, `@/src/*` 별칭, `.tsx` 확장자 import, 루트
`app/page.tsx` 생성 같은 같은 실수를 반복해 lint·build가 실패했다.

## Approach

1. 3df60cc("fix: add self-grow repair loop"): 파일을 쓰기 전에 `preflightProposal`
   (`validateChange` + `validateImports`, 없는 상대·별칭 import 거부)로 검사하고, lint·build
   실패 시 `resetToCleanBaseline`으로 되돌린 뒤 오류 로그와 diff를 붙여 `buildRepairPrompt`로
   최대 `MAX_REPAIR_ATTEMPTS`(2)회 수리 요청.
2. bf2caef("fix: prevent repeated self-grow import failures"): `validatePath`에서
   `app/page.tsx`와 루트 `app/`을, `validateImports`에서 `@/src/*`와 `.tsx` 확장자 import를
   "hard banned"로 막고, 실패 기록(`rememberFailure`, `memory.previousFailures`)과
   `deriveBannedPatterns`의 금지 문장을 다음 수리 프롬프트에 넣었다.
3. 04ed73b: package.json에 없는 외부 패키지 import를 `validateExternalImport`로 거부.
4. 38e1bf4("fix: capture self-grow validation errors"): stdout·stderr·종료 코드를 따로
   잡고(`runCapture`), `detectFailureType`로 실패 유형을 분류해 수리 프롬프트에 넣었다.

## Not done & why

- 프롬프트 규칙만으로 막기: bf2caef는 `importRulesText`, `projectStructureRulesText`를
  더하면서 같은 금지를 `validatePath`·`validateImports`에도 동시에 넣었다. 프롬프트 문장만으로는
  모델이 지키지 않는다고 본 판단으로 읽힌다([추론]).
- 실패 시 같은 프롬프트로 재시도: 모델이 무엇이 틀렸는지 모른 채 같은 실수를 한다.

## Reuse rule

self-grow 모델이 반복하는 실수는 프롬프트 문장이 아니라 `validatePath`·`validateImports`
같은 코드 검사로 막고, 그 실패를 수리 프롬프트에 되먹인다. AGENTS.md Domain Principles에 올렸다.
