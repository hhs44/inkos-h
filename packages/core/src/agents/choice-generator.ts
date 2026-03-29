import { z } from "zod";
import { BaseAgent } from "./base.js";
import { InteractiveChoiceSchema } from "../models/interactive-fiction.js";

export const GeneratedChoiceSchema = InteractiveChoiceSchema.omit({
  choiceId: true,
  fromNodeId: true,
  toNodeId: true,
  selected: true,
});
export type GeneratedChoice = z.infer<typeof GeneratedChoiceSchema>;

const GeneratedChoicesEnvelopeSchema = z.object({
  choices: z.array(GeneratedChoiceSchema).min(2).max(4),
});

export interface GenerateChoicesInput {
  readonly chapterNumber: number;
  readonly chapterContent: string;
  readonly language?: "zh" | "en";
  readonly chapterIntent?: string;
  readonly currentFocus?: string;
  readonly hookPressure?: string;
  readonly characterPressure?: string;
}

export interface GenerateChoicesOutput {
  readonly choices: ReadonlyArray<GeneratedChoice>;
  readonly tokenUsage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

export class ChoiceGeneratorAgent extends BaseAgent {
  get name(): string {
    return "choice-generator";
  }

  async generateChoices(input: GenerateChoicesInput): Promise<GenerateChoicesOutput> {
    const language = input.language ?? "zh";
    const systemPrompt = language === "en"
      ? [
          "You generate 2-4 grounded reader-facing branch choices for an interactive novel.",
          "Return JSON only in the shape:",
          "{\"choices\":[{\"label\":\"...\",\"intent\":\"...\",\"immediateGoal\":\"...\",\"expectedCost\":\"...\",\"expectedRisk\":\"...\",\"hookPressure\":\"...\",\"characterPressure\":\"...\",\"tone\":\"...\"}]}",
          "Rules:",
          "- choices must be meaningfully different",
          "- no joke or obviously bad options",
          "- each choice must be grounded in the chapter ending",
          "- keep labels concise",
        ].join("\n")
      : [
          "你负责为互动小说生成 2-4 个 grounded 的读者分支选项。",
          "只返回 JSON，格式如下：",
          "{\"choices\":[{\"label\":\"...\",\"intent\":\"...\",\"immediateGoal\":\"...\",\"expectedCost\":\"...\",\"expectedRisk\":\"...\",\"hookPressure\":\"...\",\"characterPressure\":\"...\",\"tone\":\"...\"}]}",
          "规则：",
          "- 选项必须真实分叉，不要三句同义改写",
          "- 不要玩笑选项或明显废选项",
          "- 所有选项都必须建立在章末局势上",
          "- label 要短，其他字段要具体",
        ].join("\n");

    const userPrompt = [
      language === "en" ? `Chapter ${input.chapterNumber}` : `第${input.chapterNumber}章`,
      "",
      language === "en" ? "## Chapter Ending" : "## 章末内容",
      input.chapterContent.slice(0, 5000),
      "",
      input.chapterIntent
        ? `${language === "en" ? "## Chapter Intent" : "## 当前章节意图"}\n${input.chapterIntent}`
        : "",
      input.currentFocus
        ? `${language === "en" ? "## Current Focus" : "## 当前焦点"}\n${input.currentFocus}`
        : "",
      input.hookPressure
        ? `${language === "en" ? "## Hook Pressure" : "## 伏笔压力"}\n${input.hookPressure}`
        : "",
      input.characterPressure
        ? `${language === "en" ? "## Character Pressure" : "## 人物压力"}\n${input.characterPressure}`
        : "",
    ].filter(Boolean).join("\n");

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.6, maxTokens: 2048 },
    );

    const parsed = extractFirstValidJsonObject<unknown>(response.content.trim());
    const envelope = GeneratedChoicesEnvelopeSchema.parse(parsed);
    return {
      choices: envelope.choices,
      tokenUsage: response.usage,
    };
  }
}

function extractFirstValidJsonObject<T>(text: string): T | null {
  if (!text) {
    return null;
  }

  const direct = tryParseJson<T>(text);
  if (direct) {
    return direct;
  }

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "{") continue;
    const candidate = extractBalancedJsonObject(text, index);
    if (!candidate) continue;
    const parsed = tryParseJson<T>(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function tryParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractBalancedJsonObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]!;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
      if (depth < 0) {
        return null;
      }
    }
  }

  return null;
}
