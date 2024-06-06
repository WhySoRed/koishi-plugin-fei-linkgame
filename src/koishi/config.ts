import { Schema } from "koishi";
export { Config, config, updateConfig } 

interface Config {
  atUser: boolean;
  addBreak: boolean;
  sideFree: boolean;
  moreSideFree: boolean;
  maxLink: number;
  timeLimitEachPair: number;
  comboTime: number;
  blockSize: number;
  theme: string;
  timeStartColor: string;
  timeEndColor: string;
  backGroundColorStart?: string;
  backGroundColorEnd?: string;
  lineColor?: string;
  blockColor?: string;
  blockShadowColor?: string;
  patternLibrary?: string[];
}

const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    atUser: Schema.boolean().default(false).description("是否at用户"),
    addBreak: Schema.boolean().default(true).description("是否把消息分多次发送"),
  }).description("消息设置"),
  Schema.object({
    sideFree: Schema.boolean()
      .default(true)
      .description("在相邻边的图案更容易连接"),
    moreSideFree: Schema.boolean()
      .default(false)
      .description("在四周的图案更容易连接"),
    maxLink: Schema.number().default(2).description("最大转折数"),
    timeLimitEachPair: Schema.number()
      .default(10000)
      .description("限时模式中每对方块的限时(毫秒)"),
    comboTime: Schema.number()
      .default(3000)
      .description("限时模式中连击的时间(毫秒)"),
  }).description("规则设置"),
  Schema.object({
    theme: Schema.union(["请选择一个主题","自定义", "繁花", "星空"])
      .description("主题")
      .default("请选择一个主题")
      .required(),
    timeStartColor: Schema.string()
      .role("color")
      .default("#00ff00")
      .description("时间条的起点颜色"),
    timeEndColor: Schema.string()
      .role("color")
      .default("#ff0000")
      .description("时间条的终点颜色"),
    blockSize: Schema.number()
      .default(100)
      .description("每个格子的大小(单位像素)"),
  }).description("外观设置"),
  Schema.union([
    Schema.object({
      theme: Schema.const("自定义").required(),
      backGroundColorStart: Schema.string()
        .role("color")
        .description("背景的渐变起点颜色")
        .default("#002a33"),
      backGroundColorEnd: Schema.string()
        .role("color")
        .description("背景的渐变终点颜色")
        .default("#002129"),
      lineColor: Schema.string()
        .role("color")
        .description("线条的颜色")
        .default("#de3163"),
      blockColor: Schema.string()
        .role("color")
        .description("格子的颜色")
        .default("#fcf5f7"),
      blockShadowColor: Schema.string()
        .role("color")
        .description("格子阴影的颜色")
        .default("#00a5bf"),
      patternLibrary: Schema.array(String)
        .role("table")
        .description("图案种类")
        .default([
          "😀",
          "❤️",
          "💎",
          "⚡",
          "🌸",
          "🐇",
          "⏰",
          "🍎",
          "🚀",
          "🎻",
          "🔥",
          "😈",
          "🎐",
        ]),
    }).description("主题设置"),
    Schema.object({
      theme: Schema.const("繁花").required(),
      backGroundColorStart: Schema.string()
        .role("color")
        .description("背景的渐变起点颜色")
        .default("#d3ecd9")
        .disabled(),
      backGroundColorEnd: Schema.string()
        .role("color")
        .description("背景的渐变终点颜色")
        .default("#fbdce5")
        .disabled(),
      lineColor: Schema.string()
        .role("color")
        .description("线条的颜色")
        .default("#c767ff")
        .disabled(),
      blockColor: Schema.string()
        .role("color")
        .description("格子的颜色")
        .default("#f8fff4")
        .disabled(),
      blockShadowColor: Schema.string()
        .role("color")
        .description("格子阴影的颜色")
        .default("#e1b9ff")
        .disabled(),
      patternLibrary: Schema.array(String)
        .role("table")
        .description("图案种类")
        .default([
          "🌸",
          "🌺",
          "🌻",
          "🌼",
          "🌷",
          "🌹",
          "🌱",
          "🌿",
          "🍀",
          "💐",
          "🥀",
          "🏵️",
        ])
        .disabled(),
    }).description("主题设置"),
    Schema.object({
      theme: Schema.const("星空").required(),
      backGroundColorStart: Schema.string()
        .role("color")
        .description("背景的渐变起点颜色")
        .default("#1c2471")
        .disabled(),
      backGroundColorEnd: Schema.string()
        .role("color")
        .description("背景的渐变终点颜色")
        .default("#49166d")
        .disabled(),
      lineColor: Schema.string()
        .role("color")
        .description("线条的颜色")
        .default("#f7fdf0")
        .disabled(),
      blockColor: Schema.string()
        .role("color")
        .description("格子的颜色")
        .default("#431429")
        .disabled(),
      blockShadowColor: Schema.string()
        .role("color")
        .description("格子阴影的颜色")
        .default("#9270ab")
        .disabled(),
      patternLibrary: Schema.array(String)
        .role("table")
        .description("图案种类")
        .default([
          "🌟",
          "🌠",
          "🌌",
          "🌙",
          "🌕",
          "👽",
          "🚀",
          "🛸",
          "🌎",
          "🌞",
          "🛰️",
          "🔭",
          "🪐",
        ])
        .disabled(),
    }),
  ]),
]);

let config: Config;

async function updateConfig(newConfig:Config) {
  config = newConfig;
}