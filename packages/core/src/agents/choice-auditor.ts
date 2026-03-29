import { BaseAgent } from "./base.js";
import type { GeneratedChoice } from "./choice-generator.js";

export interface ChoiceAuditIssue {
  readonly category: "invalid_choice_count" | "duplicate_choice";
  readonly description: string;
}

export interface AuditChoicesInput {
  readonly chapterNumber: number;
  readonly chapterEnding: string;
  readonly language?: "zh" | "en";
  readonly choices: ReadonlyArray<GeneratedChoice>;
}

export interface ChoiceAuditResult {
  readonly passed: boolean;
  readonly issues: ReadonlyArray<ChoiceAuditIssue>;
  readonly choices: ReadonlyArray<GeneratedChoice>;
}

export class ChoiceAuditor extends BaseAgent {
  get name(): string {
    return "choice-auditor";
  }

  async auditChoices(input: AuditChoicesInput): Promise<ChoiceAuditResult> {
    const issues: ChoiceAuditIssue[] = [];

    if (input.choices.length < 2 || input.choices.length > 4) {
      issues.push({
        category: "invalid_choice_count",
        description: input.language === "en"
          ? `Interactive chapters require 2-4 choices, but received ${input.choices.length}.`
          : `互动章节必须提供 2-4 个选项，当前收到 ${input.choices.length} 个。`,
      });
    }

    for (let leftIndex = 0; leftIndex < input.choices.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < input.choices.length; rightIndex += 1) {
        const left = input.choices[leftIndex]!;
        const right = input.choices[rightIndex]!;
        if (!isNearDuplicateChoice(left, right)) {
          continue;
        }

        issues.push({
          category: "duplicate_choice",
          description: input.language === "en"
            ? `Choice ${leftIndex + 1} and choice ${rightIndex + 1} are too similar to form a real branch.`
            : `第 ${leftIndex + 1} 个和第 ${rightIndex + 1} 个选项过于相似，不能构成真实分叉。`,
        });
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      choices: input.choices,
    };
  }
}

function isNearDuplicateChoice(left: GeneratedChoice, right: GeneratedChoice): boolean {
  const leftGoal = normalizeText(left.immediateGoal);
  const rightGoal = normalizeText(right.immediateGoal);
  const sameGoal = Boolean(leftGoal && leftGoal === rightGoal);

  const labelSimilarity = diceSimilarity(normalizeText(left.label), normalizeText(right.label));
  const intentSimilarity = diceSimilarity(normalizeText(left.intent), normalizeText(right.intent));
  const riskSimilarity = diceSimilarity(normalizeText(left.expectedRisk), normalizeText(right.expectedRisk));
  const hookSimilarity = diceSimilarity(normalizeText(left.hookPressure), normalizeText(right.hookPressure));
  const characterSimilarity = diceSimilarity(
    normalizeText(left.characterPressure),
    normalizeText(right.characterPressure),
  );
  const sameTone = normalizeText(left.tone) === normalizeText(right.tone);

  return sameGoal && sameTone && (
    intentSimilarity >= 0.55
    || riskSimilarity >= 0.55
    || hookSimilarity >= 0.55
    || characterSimilarity >= 0.55
    || labelSimilarity >= 0.55
  );
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function diceSimilarity(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  const leftCount = countMapEntries(leftBigrams);
  const rightCount = countMapEntries(rightBigrams);
  if (leftCount === 0 || rightCount === 0) {
    return 0;
  }

  let overlap = 0;
  for (const [bigram, count] of leftBigrams) {
    overlap += Math.min(count, rightBigrams.get(bigram) ?? 0);
  }
  return (2 * overlap) / (leftCount + rightCount);
}

function buildBigrams(value: string): Map<string, number> {
  const normalized = value.replace(/\s+/g, "");
  const result = new Map<string, number>();
  if (normalized.length < 2) {
    return result;
  }

  for (let index = 0; index <= normalized.length - 2; index += 1) {
    const bigram = normalized.slice(index, index + 2);
    result.set(bigram, (result.get(bigram) ?? 0) + 1);
  }

  return result;
}

function countMapEntries(value: ReadonlyMap<string, number>): number {
  let total = 0;
  for (const count of value.values()) {
    total += count;
  }
  return total;
}
