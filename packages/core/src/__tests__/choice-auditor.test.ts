import { describe, expect, it } from "vitest";
import { ChoiceAuditor } from "../agents/choice-auditor.js";

describe("ChoiceAuditor", () => {
  it("fails near-duplicate branch choices that do not create a real fork", async () => {
    const auditor = new ChoiceAuditor({
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

    const result = await auditor.auditChoices({
      language: "zh",
      chapterNumber: 12,
      chapterEnding: "章末，主角必须决定是否和档案馆的看守做交易。",
      choices: [
        {
          label: "接受看守的交易",
          intent: "接受交易，先进入档案馆再说。",
          immediateGoal: "进入档案馆。",
          expectedCost: "欠下看守一个人情。",
          expectedRisk: "以后会被勒索。",
          hookPressure: "看守背后的势力伏笔推进。",
          characterPressure: "同伴开始不信任主角。",
          tone: "紧张",
        },
        {
          label: "先答应看守的交易",
          intent: "先答应交易，先进档案馆再说。",
          immediateGoal: "进入档案馆。",
          expectedCost: "暂时背上人情债。",
          expectedRisk: "之后会被看守反制。",
          hookPressure: "看守势力伏笔继续推进。",
          characterPressure: "同伴对主角更不放心。",
          tone: "紧张",
        },
        {
          label: "拒绝交易改走暗门",
          intent: "不依赖看守，自己冒险寻找暗门。",
          immediateGoal: "绕过看守进入档案馆。",
          expectedCost: "失去最稳的入场方式。",
          expectedRisk: "一旦失败直接暴露。",
          hookPressure: "主线真相推进更慢但更自主。",
          characterPressure: "主角和同伴必须承担更大风险。",
          tone: "压迫",
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "duplicate_choice",
        }),
      ]),
    );
  });

  it("passes a grounded choice set with distinct goals and risks", async () => {
    const auditor = new ChoiceAuditor({
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

    const result = await auditor.auditChoices({
      language: "zh",
      chapterNumber: 12,
      chapterEnding: "章末，主角必须决定是否和档案馆的看守做交易。",
      choices: [
        {
          label: "接受交易",
          intent: "先借外力打开局面。",
          immediateGoal: "今晚进入档案馆。",
          expectedCost: "立刻欠下人情。",
          expectedRisk: "监视和债务会同步到来。",
          hookPressure: "匿名看守线被强推进。",
          characterPressure: "队友信任下滑。",
          tone: "紧张",
        },
        {
          label: "拒绝交易潜入",
          intent: "保留自主性，承担更高行动风险。",
          immediateGoal: "绕开看守潜入。",
          expectedCost: "失去最快入口。",
          expectedRisk: "暴露概率显著升高。",
          hookPressure: "主线推进变慢但不受制于人。",
          characterPressure: "主角要独自承担决策后果。",
          tone: "压迫",
        },
        {
          label: "先修复队伍关系",
          intent: "把当前矛盾拉回团队层面再决定行动。",
          immediateGoal: "先稳住同伴。",
          expectedCost: "错过今晚窗口。",
          expectedRisk: "线索可能被别人先拿走。",
          hookPressure: "关系线优先，案情线延后。",
          characterPressure: "队友必须正面表达立场。",
          tone: "克制",
        },
      ],
    });

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
