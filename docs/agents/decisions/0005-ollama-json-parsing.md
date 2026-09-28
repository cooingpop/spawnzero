# 0005: Ollama 응답에서 JSON을 방어적으로 꺼낸다

- Date: 2026-07-01
- Area: scripts/self-grow.mjs `requestOllama`, `extractJsonCandidate`, `generateProposal`

## Problem

qwen3 응답이 `<think>` 블록, 코드 펜스, 앞뒤 설명을 섞어 보내 `JSON.parse`가 실패했다.

## Approach

1. e4bee56("fix: harden self-grow JSON parsing"): `temperature`를 0.2에서 0.1로 낮춤.
   `format: "json"`은 639475b부터 있었다.
2. `extractJsonCandidate`: `<think>...</think>` 제거, 코드 펜스가 있으면 그 안쪽, 첫 `{`부터
   마지막 `}`까지 잘라 파싱.
3. 파싱이나 `validateChange`가 실패하면 "Your previous response was invalid JSON" 문장을
   붙여 최대 `MAX_GENERATE_ATTEMPTS`(3)회 재요청하고, 원문 앞부분을 로그로 남김.
4. 38e1bf4에서 `num_predict: 8192`를 추가.

## Not done & why

- 639475b의 방식(코드 펜스 문자열을 지우고 파싱, 실패하면 `{`~`}`로 한 번 더 잘라 파싱,
  그래도 실패하면 재요청 없이 실행 종료): e4bee56이 위 방식으로 바꿨다. 커밋 제목 외에
  이유를 적은 기록은 없다. `format: "json"`만으로는 형식이 보장되지 않았다는 판단으로
  읽힌다([추론]).

## Reuse rule

모델 응답 파싱을 바꿀 때 `<think>` 제거, 펜스 추출, 재요청 루프를 유지한다.
