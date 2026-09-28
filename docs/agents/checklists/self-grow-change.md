# Checklist: self-grow 스크립트·워크플로 변경

`scripts/self-grow.mjs`나 `.github/workflows/self-grow.yml`을 바꾸는 모든 변경에 쓴다.
이 스크립트는 `git reset --hard`, `git clean -fd`, origin push, 공개 PR 생성을 하고,
`npm run build`는 이 파일을 검사하지 않는다. git 이력에서 가장 자주 바뀐 파일이다
(전체 11개 커밋 중 8개).

1. `AGENTS.md`의 Hard Rules, "안 하기로 한 것", Escalation Rules와
   `docs/agents/decisions/0001`~`0006`을 읽는다. 변경이 그중 하나를 약하게 하면 멈추고
   오너에게 묻는다.
2. 문법 확인: `node --check scripts/self-grow.mjs`가 출력 없이 끝나야 한다.
3. lint: `npm run lint`가 통과해야 한다. `eslint.config.mjs`의 `globalIgnores`에 `scripts/`는 없지만,
   `.mjs`가 실제 lint 대상인지는 확인되지 않았다. lint 통과를 이 파일의 검증으로 보고하지 않는다.
4. 자동 머지가 돌아오지 않았는지: `grep -n 'pr", "merge"' scripts/self-grow.mjs`가 0건.
5. 경로 가드가 약해지지 않았는지: `grep -n 'FORBIDDEN_PATHS =\|FORBIDDEN_PREFIXES =\|ALLOWED_DIRS =\|ALLOWED_ROOT_FILES =' scripts/self-grow.mjs`
   출력에서 `.env`, `package-lock.json`, `.git/`, `node_modules/`, `.next/`, `.vercel/`이 금지
   쪽에 남아 있고, 허용 쪽에 `scripts/`, `.github/`가 없어야 한다. 바뀌었으면 오너 확인.
6. 파일 수 상한: `grep -n 'change.files.length > 3' scripts/self-grow.mjs`가 1건. 상한을
   바꿨으면 오너 확인.
7. 프롬프트 문장을 더하거나 뺐으면(`buildPrompt`, `buildRepairPrompt`, `*RulesText`), 그
   문장이 안전·빌드 규칙인지 방향 제시인지 PR 설명에 적고 오너에게 묻는다
   (`docs/agents/decisions/0002-no-human-direction-in-prompt.md`).
8. 안전 규칙을 바꿨으면 `docs/experiment-rules.md`의 "Safety rules"와 README.md를 같은
   커밋에서 맞춘다. `git diff --stat`에 세 파일이 함께 나와야 한다.
9. 워크플로를 바꿨으면 `grep -n 'runs-on\|workflow_dispatch' .github/workflows/self-grow.yml`
   출력에 `self-hosted`와 `workflow_dispatch`가 있어야 한다.
10. 제안 JSON 필드나 환경 변수, 파이프라인 단계를 바꿨으면 `docs/agents/inventory.md`를
    refresh-inventory 절차로 재생성한다.
11. 실제 실행(`npm run grow`)은 에이전트가 하지 않는다. 필요하면 "(미검증) 실제 실행은
    오너 확인 필요"로 보고한다.
