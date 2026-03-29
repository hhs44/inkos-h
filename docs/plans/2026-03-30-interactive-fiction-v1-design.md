# Interactive Fiction V1 Design

**Goal:** Add a first-class interactive-fiction mode to InkOS by introducing chapter-end branching while preserving the existing chapter-based writing, audit, revise, truth-file, and runtime-state pipeline.

## Summary

Interactive fiction v1 should not replace InkOS's chapter-writing core. It should add a branch system around that core.

The recommended v1 shape is:

- chapters remain the unit of generation
- each completed chapter can produce 2-4 grounded reader choices
- each choice creates a persistent branch node
- only the selected branch continues generating new chapters
- unselected branches remain dormant but recoverable later

This gives InkOS real branching narrative structure without forcing a rewrite into a node-by-node text-adventure engine.

## Why This Shape

### Do not rewrite the chapter engine first

InkOS already has valuable infrastructure:

- chapter writing
- revise / audit
- truth-file rebuild
- runtime state
- snapshots / rewrite / rollback
- export / review / eval

If v1 changes the smallest unit from "chapter" to "scene node", all of those systems become unstable at once.

So the right heavy refactor is:

- rebuild branching
- rebuild branch state management
- keep the chapter-writing engine intact

### Why not free-form player input first

Free-form actions look attractive, but they explode ambiguity:

- action parsing
- branch normalization
- invalid-action handling
- state mutation safety
- prompt drift

Reader-choice branching gives InkOS a constrained interaction surface first. Later, free-form player input can be added as a higher-risk edge type on top of the same branch tree.

## Narrative Mode

Add a new book-level mode in `book.json`:

- `narrativeMode: "linear" | "interactive-tree"`

Default remains `linear`.

Interactive branching behavior only activates when `narrativeMode === "interactive-tree"`.

## Core Model

### 1. Branch Tree

Create a new persistent artifact:

- `story/interactive/branch-tree.json`

This is the source of truth for interactive structure.

It contains:

- book-level metadata
- active branch pointer
- branch nodes
- branch edges / choices

### 2. Branch Nodes

A branch node represents a recoverable narrative state, not necessarily a fully written branch.

Recommended fields:

- `nodeId`
- `parentNodeId`
- `sourceChapterId`
- `sourceChapterNumber`
- `branchDepth`
- `branchLabel`
- `status: active | awaiting-choice | dormant | completed`
- `snapshotRef`
- `selectedChoiceId`
- `chapterIds: string[]`
- `displayPath`

Important meaning:

- a node is the point from which writing can continue
- multiple child nodes may initially share the same chapter-end snapshot
- only the active node is projected into live truth files

### 3. Branch Choices

Choices are explicit edges between nodes.

Recommended fields:

- `choiceId`
- `fromNodeId`
- `toNodeId`
- `label`
- `intent`
- `immediateGoal`
- `expectedCost`
- `expectedRisk`
- `hookPressure`
- `characterPressure`
- `tone`
- `selected: boolean`

Choices are not cosmetic strings. They are structured next-chapter directions.

## Chapter Identity

### Internal IDs

Use globally unique internal chapter IDs for storage.

Do not try to make each branch own an independent global chapter-number namespace.

Recommended split:

- internal: globally unique chapter id / monotonic storage number
- display: branch-local sequence index for UX

Why:

- preserves existing storage, export, review, and audit assumptions
- avoids collisions across branches
- lets linear tools keep working with minimal change

## Snapshot Strategy

Reuse the existing snapshot system.

After chapter `N` finishes:

- current state is snapshotted exactly once
- all generated child branch nodes reference that same snapshot
- no child branch pre-generates chapter `N+1`

So for a chapter with choices A/B/C:

- chapter 12 ends
- snapshot 12 exists
- child nodes A/B/C all point to snapshot 12
- user selects B
- only then does branch B generate its next chapter

This keeps branching persistent without duplicating a full book state tree at choice generation time.

## Choice Generation

Choice generation should be its own step, not something the writer casually appends.

### ChoiceGenerator

Inputs:

- current chapter content
- active branch runtime state
- current focus
- planner/composer intent
- active hooks / dormant pressure
- character pressure

Outputs:

- 2-4 structured choices

### ChoiceAuditor

Audits choice quality:

- choices must be meaningfully different
- no obviously fake branch set
- no nonsense or "bad joke" option
- choices must be grounded in chapter-end state

### Recommended choice policy

Prefer:

- 1 lower-risk / stabilizing option
- 1 higher-risk / high-payoff option
- 1 relationship / emotional option
- optional 4th only if naturally justified

This avoids both "three paraphrases of the same branch" and gimmicky fake interactivity.

## Truth Files And Runtime State

The live truth files for an interactive book represent the active branch only.

That means files like:

- `current_state.md`
- `pending_hooks.md`
- `chapter_summaries.md`

are branch-local projections, not universal whole-book truth.

Persistent cross-branch truth is stored in:

- `branch-tree.json`
- snapshots
- chapter lineage attached to branch nodes

### Branch switch behavior

Switching branch should perform:

1. restore the referenced snapshot
2. restore branch-local projected state
3. update active branch pointer
4. continue writing from that branch

The branch tree is canonical. The live markdown truth files are the active projection.

## CLI Flow

Keep `write next`, but add branch control commands.

Recommended commands:

- `inkos branch choices`
- `inkos branch choose <choice-id>`
- `inkos branch tree`
- `inkos branch switch <node-id>`

### Main loop

1. `write next`
2. chapter completes
3. choice generation runs
4. current node becomes `awaiting-choice`
5. user inspects choices
6. user chooses one
7. selected child node becomes active
8. next `write next` continues that branch

### Important gating rule

If the active node is `awaiting-choice`, `write next` must refuse to continue until a branch is selected.

This prevents accidental silent continuation down an undefined path.

## Compatibility Rules

### Linear books

Linear books should behave exactly as today.

### Interactive books

Interactive books reuse:

- writer
- reviser
- continuity auditor
- state validator
- snapshots
- rewrite

But commands operate on the active branch by default.

Later versions can add `--branch`, but v1 should keep default behavior simple.

## Export And Review

Do not solve full branch-aware export in v1.

V1 export and review policy should be:

- default export = active branch only
- default review = active branch only
- tree visualization = separate command / future enhancement

This keeps v1 bounded.

## Error Handling

### Branch tree missing or corrupt

- interactive commands fail closed
- linear commands remain unaffected

### Snapshot missing for target node

- branch switch fails
- active branch remains unchanged

### Choice generation fails

Recommended v1 behavior:

- chapter is still saved
- node is marked `awaiting-choice-generation`
- user can retry choice generation explicitly

Do not lose the chapter because choice generation failed.

### Invalid choose

- reject with a clear error
- do not mutate branch state

## Non-Goals For V1

Out of scope:

- free-form player action parsing
- scene/node-level engine
- branch-aware EPUB for all paths
- auto-generating all child branches in parallel
- full interactive UI
- branch-local manga export

These belong to v2+.

## Testing Strategy

Minimum required regressions:

1. interactive book writes one chapter and persists choice nodes
2. unselected choices persist as dormant branch nodes with shared snapshot refs
3. `write next` refuses when active node awaits choice
4. `branch choose` activates the selected child branch
5. `branch switch` restores the correct snapshot
6. linear books remain unaffected

## Recommendation

Build interactive fiction v1 as a chapter-tree system:

- branch-heavy
- stateful
- recoverable
- chapter-based

Do not build a free-form adventure engine first.

Do not rebuild InkOS around scene nodes in v1.

The right first step is a formal branch tree wrapped around the existing chapter pipeline.
