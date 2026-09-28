# 0003: 홈 화면을 빈 상태(`return null`)로 되돌린다

- Date: 2026-07-01
- Area: src/app/page.tsx `Home`, src/app/globals.css

## Problem

부트스트랩(639475b)에서 사람이 만든 랜딩 페이지(상태 카드, GitHub 링크, 다크 배경,
그라디언트)가 모델의 출발점에 사람의 디자인과 문구를 심어 두었다.

## Approach

1. fb69af3("refactor: reset landing page to zero base"): 랜딩 페이지를 제목과 두 줄
   상태 문구로 줄이고 배경 그라디언트를 지웠다.
2. cc0b2f2("refactor: reset page to true blank state"): `Home`이 `null`을 반환하게 하고,
   `globals.css`를 흰 배경·검은 글자 토큰과 `box-sizing`만 남겼다.

## Not done & why

- 최소 소개 문구 유지(fb69af3 상태): 바로 다음 커밋에서 그것도 지웠다. 커밋 제목의
  "true blank state"가 근거다. 문구 하나도 모델에게는 방향이 된다는 판단으로 읽힌다([추론]).

## Reuse rule

사람(에이전트 포함)은 `src/app/`에 화면 내용·디자인을 넣지 않는다. 빈 `Home`을 버그로
보고 채우지 않는다. AGENTS.md Domain Principles와 "안 하기로 한 것"에 올렸다.
