# 0002: self-grow 프롬프트에서 사람의 방향 제시를 뺀다

- Date: 2026-07-01
- Area: scripts/self-grow.mjs `buildPrompt`, `buildRepairPrompt`, `safetyRulesText`

## Problem

모델 프롬프트에 프로젝트 철학과 주제 선호가 들어 있어, 모델이 스스로 고른 변경인지
사람이 유도한 변경인지 구분할 수 없었다.

## Approach

1. 04ed73b("refactor: reduce self-grow direction bias"): "SpawnZero philosophy" 문단,
   "make SpawnZero a more meaningful project", 수리 프롬프트의 "Prefer changes related to
   SpawnZero's self-growing experiment...", blog 주제 금지(`bannedProposalTopics`,
   `hasBlogTopic`, `formatBannedTopics`)를 지웠다.
2. cc0b2f2("refactor: reset page to true blank state"): 핵심 지시를 "Look at the current
   repository state. Decide one small next change. Keep it buildable. Follow safety rules.
   Return valid JSON only."로 줄였다.
3. 같은 커밋에서 `safetyRulesText`에 fake contact/business 내용과 generic contact, pricing,
   careers, testimonials 페이지 금지를 더했다.

## Not done & why

- 주제 금지(blog 등)로 모델을 원하는 쪽으로 몰기: docs/experiment-rules.md의 "Humans should
  not provide: A specific service idea, A fixed app direction..."에 어긋난다.
- 저장소 이름·철학을 프롬프트에 넣어 "의미 있는" 변경을 유도하기: 같은 이유로 뺐다.

## Reuse rule

프롬프트에 문장을 더할 때 그 문장이 안전·빌드 가능성 규칙인지 방향 제시인지 먼저
가린다. 방향 제시는 넣지 않고, 애매하면 오너에게 묻는다. AGENTS.md Domain Principles에 올렸다.
cc0b2f2의 페이지 종류 금지가 이 원칙과 어떻게 맞는지는 오너 확인 대기.
