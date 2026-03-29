# Interactive Fiction V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `interactive-tree` narrative mode where chapter-end reader choices create persistent branch nodes, while keeping InkOS's chapter-writing pipeline intact.

**Architecture:** Reuse the existing chapter generation pipeline and snapshots. Add a branch-tree persistence layer, branch-aware state activation, chapter-end choice generation, and CLI branch commands. Keep live truth files as the active-branch projection only.

**Tech Stack:** TypeScript, Commander CLI, Vitest, existing InkOS pipeline/state/snapshot system

---

### Task 1: Add the narrative mode model

**Files:**
- Modify: `packages/core/src/models/book.ts`
- Test: `packages/core/src/__tests__/fanfic-models.test.ts` or a new book-model test

**Step 1: Write the failing test**

Add a test that parses:

- `narrativeMode: "linear"`
- `narrativeMode: "interactive-tree"`

and rejects unknown values.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/...`

Expected: FAIL because `interactive-tree` is not yet allowed.

**Step 3: Write minimal implementation**

Add:

- `NarrativeModeSchema`
- `narrativeMode` on `BookConfigSchema`
- default to `linear`

**Step 4: Run test to verify it passes**

Run the targeted Vitest file again.

**Step 5: Commit**

```bash
git add packages/core/src/models/book.ts packages/core/src/__tests__/...
git commit -m "feat: add interactive narrative mode"
```

### Task 2: Define branch-tree persistence schema

**Files:**
- Create: `packages/core/src/models/interactive-fiction.ts`
- Test: `packages/core/src/__tests__/interactive-fiction-models.test.ts`

**Step 1: Write the failing test**

Add schema tests for:

- branch tree metadata
- branch nodes
- branch choices
- `activeNodeId`
- shared `snapshotRef`

**Step 2: Run test to verify it fails**

Run the new test file.

Expected: FAIL because schema file does not exist.

**Step 3: Write minimal implementation**

Create schema/types for:

- tree metadata
- node status
- choice record
- branch node
- branch tree

**Step 4: Run test to verify it passes**

Run the targeted schema test.

**Step 5: Commit**

```bash
git add packages/core/src/models/interactive-fiction.ts packages/core/src/__tests__/interactive-fiction-models.test.ts
git commit -m "feat: define branch tree schemas"
```

### Task 3: Add state-manager helpers for interactive storage

**Files:**
- Modify: `packages/core/src/state/manager.ts`
- Test: `packages/core/src/__tests__/state-manager.test.ts`

**Step 1: Write the failing test**

Add tests for helpers that:

- load/save `story/interactive/branch-tree.json`
- initialize an empty root branch
- return the active node

**Step 2: Run test to verify it fails**

Run the targeted tests.

Expected: FAIL because helper methods do not exist.

**Step 3: Write minimal implementation**

Add helpers such as:

- `interactiveDir(bookId)`
- `loadBranchTree(bookId)`
- `saveBranchTree(bookId, tree)`
- `ensureInteractiveTree(bookId)`

**Step 4: Run test to verify it passes**

Run the targeted state-manager tests.

**Step 5: Commit**

```bash
git add packages/core/src/state/manager.ts packages/core/src/__tests__/state-manager.test.ts
git commit -m "feat: add interactive branch tree persistence helpers"
```

### Task 4: Initialize interactive books correctly at create time

**Files:**
- Modify: `packages/core/src/pipeline/runner.ts`
- Modify: `packages/cli/src/commands/book.ts`
- Test: `packages/core/src/__tests__/pipeline-runner.test.ts`
- Test: `packages/cli/src/__tests__/cli-integration.test.ts`

**Step 1: Write the failing test**

Add tests that:

- create an interactive book
- verify `branch-tree.json` exists
- verify the tree contains a root node and active pointer

**Step 2: Run test to verify it fails**

Run the targeted test files.

Expected: FAIL because create flow does not initialize interactive metadata.

**Step 3: Write minimal implementation**

When `narrativeMode === "interactive-tree"`:

- create interactive storage during book initialization
- seed a root branch node

**Step 4: Run test to verify it passes**

Run the targeted tests again.

**Step 5: Commit**

```bash
git add packages/core/src/pipeline/runner.ts packages/cli/src/commands/book.ts packages/core/src/__tests__/pipeline-runner.test.ts packages/cli/src/__tests__/cli-integration.test.ts
git commit -m "feat: initialize interactive books with root branch tree"
```

### Task 5: Add chapter-end choice generation models and parser

**Files:**
- Create: `packages/core/src/agents/choice-generator.ts`
- Create: `packages/core/src/agents/choice-auditor.ts`
- Test: `packages/core/src/__tests__/choice-generator.test.ts`
- Test: `packages/core/src/__tests__/choice-auditor.test.ts`

**Step 1: Write the failing test**

Add tests that require generated choices to include:

- `label`
- `intent`
- `immediateGoal`
- `expectedCost`
- `expectedRisk`
- `hookPressure`
- `characterPressure`
- `tone`

Also add a failure case for near-duplicate choices.

**Step 2: Run test to verify it fails**

Run both targeted test files.

Expected: FAIL because these agents do not exist.

**Step 3: Write minimal implementation**

Implement:

- choice generation prompt/output parsing
- choice auditing for duplicate/fake branches

**Step 4: Run test to verify it passes**

Run targeted tests again.

**Step 5: Commit**

```bash
git add packages/core/src/agents/choice-generator.ts packages/core/src/agents/choice-auditor.ts packages/core/src/__tests__/choice-generator.test.ts packages/core/src/__tests__/choice-auditor.test.ts
git commit -m "feat: add interactive choice generation agents"
```

### Task 6: Persist branch children after chapter completion

**Files:**
- Modify: `packages/core/src/pipeline/runner.ts`
- Modify: `packages/core/src/state/manager.ts`
- Test: `packages/core/src/__tests__/pipeline-runner.test.ts`

**Step 1: Write the failing test**

Add a test for interactive mode where:

- `writeNextChapter()` saves chapter 1
- generates 2-4 choices
- creates child nodes
- all child nodes reference the same `snapshotRef`
- active node becomes `awaiting-choice`

**Step 2: Run test to verify it fails**

Run the targeted runner test.

Expected: FAIL because chapters do not yet emit branch nodes.

**Step 3: Write minimal implementation**

In interactive mode, after successful chapter persistence:

- run choice generation
- run choice audit
- create child nodes and choices
- store them in the branch tree
- leave only one active pointer

**Step 4: Run test to verify it passes**

Run the targeted runner test.

**Step 5: Commit**

```bash
git add packages/core/src/pipeline/runner.ts packages/core/src/state/manager.ts packages/core/src/__tests__/pipeline-runner.test.ts
git commit -m "feat: persist branch choices after interactive chapters"
```

### Task 7: Block write-next when a choice is pending

**Files:**
- Modify: `packages/core/src/pipeline/runner.ts`
- Modify: `packages/core/src/pipeline/agent.ts`
- Test: `packages/core/src/__tests__/pipeline-runner.test.ts`
- Test: `packages/core/src/__tests__/pipeline-agent.test.ts`

**Step 1: Write the failing test**

Add tests that:

- refuse `writeNextChapter()` on interactive books when active node is `awaiting-choice`
- refuse agent `write_draft` / `write_full_pipeline` in the same state

**Step 2: Run test to verify it fails**

Run the targeted tests.

Expected: FAIL because write flow still continues linearly.

**Step 3: Write minimal implementation**

Add fail-closed guards before chapter generation starts.

**Step 4: Run test to verify it passes**

Run targeted tests again.

**Step 5: Commit**

```bash
git add packages/core/src/pipeline/runner.ts packages/core/src/pipeline/agent.ts packages/core/src/__tests__/pipeline-runner.test.ts packages/core/src/__tests__/pipeline-agent.test.ts
git commit -m "fix: require branch choice before continuing interactive writing"
```

### Task 8: Add CLI branch commands

**Files:**
- Create: `packages/cli/src/commands/branch.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/src/__tests__/cli-integration.test.ts`

**Step 1: Write the failing test**

Add CLI integration tests for:

- `inkos branch tree`
- `inkos branch choices`
- `inkos branch choose <choice-id>`
- `inkos branch switch <node-id>`

**Step 2: Run test to verify it fails**

Run the targeted CLI test(s).

Expected: FAIL because `branch` command does not exist.

**Step 3: Write minimal implementation**

Add a new CLI command group that:

- lists current branch tree
- shows pending choices
- selects a choice
- switches active node

**Step 4: Run test to verify it passes**

Run targeted CLI tests again.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/branch.ts packages/cli/src/index.ts packages/cli/src/__tests__/cli-integration.test.ts
git commit -m "feat: add interactive branch CLI commands"
```

### Task 9: Restore the correct snapshot on branch switch

**Files:**
- Modify: `packages/core/src/state/manager.ts`
- Modify: `packages/core/src/pipeline/runner.ts`
- Test: `packages/core/src/__tests__/state-manager.test.ts`
- Test: `packages/core/src/__tests__/pipeline-runner.test.ts`

**Step 1: Write the failing test**

Add tests that switching to another branch:

- restores the referenced snapshot
- reprojects active branch truth files
- leaves other branch nodes unchanged

**Step 2: Run test to verify it fails**

Run the targeted tests.

Expected: FAIL because switch only updates metadata or is not implemented.

**Step 3: Write minimal implementation**

Implement branch activation as:

- restore snapshot
- mark branch active
- persist active branch pointer

**Step 4: Run test to verify it passes**

Run targeted tests again.

**Step 5: Commit**

```bash
git add packages/core/src/state/manager.ts packages/core/src/pipeline/runner.ts packages/core/src/__tests__/state-manager.test.ts packages/core/src/__tests__/pipeline-runner.test.ts
git commit -m "feat: restore snapshots when switching interactive branches"
```

### Task 10: Keep linear-mode behavior unchanged

**Files:**
- Modify: `packages/core/src/__tests__/pipeline-runner.test.ts`
- Modify: `packages/cli/src/__tests__/cli-integration.test.ts`

**Step 1: Write the failing test**

Add regressions proving:

- linear books still write chapters exactly as before
- no branch metadata is required for linear books
- branch commands reject linear books cleanly

**Step 2: Run test to verify it fails**

Run the targeted tests.

Expected: FAIL because interactive checks leak into linear mode or commands are too permissive.

**Step 3: Write minimal implementation**

Tighten mode checks so interactive behavior is gated strictly by `narrativeMode`.

**Step 4: Run test to verify it passes**

Run targeted tests again.

**Step 5: Commit**

```bash
git add packages/core/src/__tests__/pipeline-runner.test.ts packages/cli/src/__tests__/cli-integration.test.ts
git commit -m "test: lock linear compatibility for interactive mode"
```

### Task 11: Add minimal docs for user flow

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `skills/SKILL.md`

**Step 1: Write the failing test**

No automated doc test required. Instead, write a short checklist of required user-facing docs:

- create interactive book
- write chapter
- inspect choices
- choose branch
- switch branch

**Step 2: Run manual verification**

Check README/skill docs are missing or outdated.

Expected: missing interactive instructions.

**Step 3: Write minimal implementation**

Document:

- what interactive-tree mode is
- the branch CLI flow
- what remains out of scope in v1

**Step 4: Run manual verification**

Read both READMEs and `skills/SKILL.md` to verify the flow is discoverable.

**Step 5: Commit**

```bash
git add README.md README.en.md skills/SKILL.md
git commit -m "docs: add interactive fiction branch workflow"
```

### Task 12: End-to-end acceptance and release note prep

**Files:**
- Modify: `packages/core/src/__tests__/pipeline-runner.test.ts`
- Modify: `packages/cli/src/__tests__/cli-integration.test.ts`
- Optional: `docs/plans/...` if acceptance notes are appended

**Step 1: Write the failing test**

Add one narrow end-to-end acceptance test that:

- creates an interactive book
- writes chapter 1
- persists branch choices
- chooses a branch
- writes chapter 2 on that branch

**Step 2: Run test to verify it fails**

Run the targeted acceptance tests.

Expected: FAIL until all pieces are wired together.

**Step 3: Write minimal implementation**

Fill any missing wiring only if acceptance still fails.

**Step 4: Run test to verify it passes**

Run:

- targeted acceptance tests
- focused branch CLI tests
- focused runner tests
- `pnpm typecheck` in `packages/core`
- `pnpm typecheck` in `packages/cli`

**Step 5: Commit**

```bash
git add packages/core/src/__tests__/pipeline-runner.test.ts packages/cli/src/__tests__/cli-integration.test.ts
git commit -m "test: cover interactive fiction v1 end-to-end flow"
```
