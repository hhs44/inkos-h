import { afterEach, describe, expect, it, vi } from "vitest";
import { ChoiceGeneratorAgent } from "../agents/choice-generator.js";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

describe("ChoiceGeneratorAgent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses 2-4 structured reader choices with the required fields", async () => {
    const agent = new ChoiceGeneratorAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          maxTokensCap: null,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: JSON.stringify({
          choices: [
            {
              label: "接受临时合作",
              intent: "先借对方的力量进入档案库，但保留反制余地。",
              immediateGoal: "今晚就进入档案库。",
              expectedCost: "欠下一个必须兑现的人情。",
              expectedRisk: "合作方会趁机监视主角。",
              hookPressure: "匿名委托人伏笔被强推进。",
              characterPressure: "同伴对主角的信任出现裂缝。",
              tone: "紧张",
            },
            {
              label: "绕开对方单独潜入",
              intent: "拒绝合作，自己寻找更危险但自主的入口。",
              immediateGoal: "在不暴露关系网的情况下潜入。",
              expectedCost: "失去现成资源和时间窗口。",
              expectedRisk: "一旦失败就会直接暴露身份。",
              hookPressure: "旧案真相伏笔延后但压力升高。",
              characterPressure: "主角的控制欲进一步加重。",
              tone: "压迫",
            },
            {
              label: "先稳住同伴再决定",
              intent: "把行动推迟到先修复队内裂痕之后。",
              immediateGoal: "让队伍暂时重新站到一起。",
              expectedCost: "错过本章的最佳时机。",
              expectedRisk: "档案可能被别人先一步转移。",
              hookPressure: "人际关系线优先，主线推进变慢。",
              characterPressure: "同伴必须正面表达不满。",
              tone: "克制",
            },
          ],
        }),
        usage: ZERO_USAGE,
      });

    const result = await agent.generateChoices({
      chapterNumber: 12,
      chapterContent: "章末，主角拿到了进入档案库的唯一机会，但同伴并不同意他的决定。",
      language: "zh",
      chapterIntent: "让章末形成明确分叉。",
      currentFocus: "档案库潜入与队伍信任裂痕",
    });

    expect(result.choices).toHaveLength(3);
    expect(result.choices[0]).toMatchObject({
      label: "接受临时合作",
      intent: expect.any(String),
      immediateGoal: expect.any(String),
      expectedCost: expect.any(String),
      expectedRisk: expect.any(String),
      hookPressure: expect.any(String),
      characterPressure: expect.any(String),
      tone: expect.any(String),
    });
  });
});
