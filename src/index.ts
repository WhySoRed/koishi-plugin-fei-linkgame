import { Context, Random, Schema, Session, h } from "koishi";
import {} from "@koishijs/plugin-help";

import { Table as LinkTable, Point as LinkPoint, Table } from "./linkGame";
import {
  draw as canvasDraw,
  drawWin as canvasDrawWin,
  drawWelcome as canvasDrawWelcome,
  drawOver as canvasDrawOver,
} from "./drawCanvas";
import {
  draw as puppeteerDraw,
  drawWelcome as puppeteerDrawWelcome,
  drawWin as puppeteerDrawWin,
  drawOver as puppeteerDrawOver,
} from "./drawPuppeteer";
import {} from "koishi-plugin-puppeteer";
import test from "node:test";

export const inject = {
  required: ["database", "canvas"],
  optional: ["puppeteer"],
};

export const name = "fei-linkgame";

export const usage = `
可以在koishi上玩连连看~
小心不要沉迷哦...
`;

export interface Config {
  atUser: boolean;
  sideFree: boolean;
  moreSideFree: boolean;
  maxLink: number;
  blockSize: number;
  theme: string;
  backGroundColorStart?: string;
  backGroundColorEnd?: string;
  lineColor?: string;
  blockColor?: string;
  blockShadowColor?: string;
  pattermType?: string[];
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    atUser: Schema.boolean().default(false).description("是否at用户"),
  }).description("基础设置"),
  Schema.object({
    sideFree: Schema.boolean()
      .default(true)
      .description("在相邻边的图案更容易连接"),
    moreSideFree: Schema.boolean()
      .default(false)
      .description("在四周的图案更容易连接"),
    maxLink: Schema.number().default(2).description("最大转折数"),
  }).description("规则设置"),
  Schema.object({
    theme: Schema.union(["自定义", "繁花", "星空"])
      .description("主题")
      .required(),
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
      pattermType: Schema.array(String)
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
          "🎐"
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
      pattermType: Schema.array(String)
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
      pattermType: Schema.array(String)
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
          "🪐"
        ])
        .disabled()
    })
  ]),
]);

declare module "koishi" {
  interface Tables {
    linkGameData: LinkGameData;
  }
}

export interface LinkGameData {
  cid: string;
  xLength: number;
  yLength: number;
  maxPatternTypes: number;
  maxScore: number;
}
class LinkGame {
  isPlaying: boolean = false;
  patterns: string[];
  patternColors: string[];
  table: LinkTable;
  lastLinkTime: number;
  combo: number;
  timeLimit: number;
  endGameTimer: () => void;
  score: number;
}

export function apply(ctx: Context, config: Config) {
  const pptrOn = ctx.puppeteer ? true : false;

  const linkGameDraw = pptrOn ? puppeteerDraw : canvasDraw;
  const winLinkGameDraw = pptrOn ? puppeteerDrawWin : canvasDrawWin;
  const welcomeLinkGameDraw = pptrOn ? puppeteerDrawWelcome : canvasDrawWelcome;
  const overLinkGameDraw = pptrOn ? puppeteerDrawOver : canvasDrawOver;

  const linkGameTemp: { [key: string]: LinkGame } = {};

  ctx.on("ready", () => {
    ctx.database.extend(
      "linkGameData",
      {
        cid: "string",
        xLength: { type: "unsigned", initial: 5 },
        yLength: { type: "unsigned", initial: 6 },
        maxPatternTypes: { type: "unsigned", initial: 9 },
        maxScore: { type: "unsigned", initial: 0 },
      },
      {
        primary: ["cid"],
      }
    );
  });

  ctx.on("dispose", () => {});

  ctx.command("连连看").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const img = await welcomeLinkGameDraw(session, config);
    await session.send(
      img +
        at +
        `一起来玩...\n` +
        `KOISHI连连看~\n` +
        `指令一览：\n\n` +
        `连连看.开始\n` +
        `连连看.结束\n` +
        `连连看.重排\n` +
        `连连看.设置\n` +
        `连连看.连`
    );
  });

  ctx.command("连连看.设置").action(async ({ session, args }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (linkGame.isPlaying) return at + " 游戏中不可以更改设置哦";

    let linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", { cid });
      linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    }

    const xLength = linkGameData.xLength;
    const yLength = linkGameData.yLength;
    const maxPatternTypes = linkGameData.maxPatternTypes;
    // TODO: 把这个用图片输出
    if (args.length === 0) {
      return (
        at +
        `当前设置：\n` +
        `每列图案个数：${xLength}\n` +
        `每行图案个数：${yLength}\n` +
        `当前图案库存数：${config.pattermType.length}\n` +
        `当前每局图案最大数量：${maxPatternTypes}\n\n` +
        `想要修改设置请使用指令：\n` +
        `连连看.设置 [每行个数] [每列个数] [种类数]\n`
      );
    } else if (args.length === 3) {
      const xLength = Math.floor(+args[0]);
      const yLength = Math.floor(+args[1]);
      const maxPatternTypes = Math.floor(+args[2]);
      if (isNaN(xLength) || isNaN(yLength) || isNaN(maxPatternTypes))
        return at + "参数错误";
      if (xLength < 2 || yLength < 2 || maxPatternTypes < 2)
        return at + "参数错误";
      if ((xLength * yLength) % 2 !== 0) return at + "格子总数要是偶数个才行..";
      if (maxPatternTypes > config.pattermType.length)
        return at + "我准备的图案没有那么多呀...";
      if (maxPatternTypes < 1) return at + "额...起码得有一种图案吧...";
      else {
        await ctx.database.set(
          "linkGameData",
          { cid: session.cid },
          { xLength, yLength, maxPatternTypes }
        );
        return at + "设置更改成功~";
      }
    } else return at + "参数数量错误";
  });

  ctx.command("连连看.开始").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (linkGame.isPlaying) return at + `游戏已经开始了`;

    let linkGameData = (
      await ctx.database.get("linkGameData", { cid: session.cid })
    )[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", { cid: session.cid });
      linkGameData = (
        await ctx.database.get("linkGameData", { cid: session.cid })
      )[0];
    }

    const xLength = linkGameData.xLength;
    const yLength = linkGameData.yLength;
    const maxPatternTypes = linkGameData.maxPatternTypes;
    if (maxPatternTypes > config.pattermType.length)
      return at + "现在图案种类比库存多...请更改设置";

    linkGame.isPlaying = true;
    const random = new Random();
    linkGame.patterns = random
      .shuffle(config.pattermType)
      .slice(0, maxPatternTypes);
    linkGame.patternColors = [];
    for (let i = 0; i < maxPatternTypes; i++) {
      linkGame.patternColors.push(config.lineColor);
    }
    linkGame.table = new LinkTable(xLength, yLength, maxPatternTypes);
    const img = await linkGameDraw(
      session,
      config,
      linkGame.patterns,
      linkGame.patternColors,
      linkGame.table
    );
    session.send(
      at +
        `游戏开始咯~\n` +
        `大小${linkGame.table.xLength}x${linkGame.table.yLength} 图案数${linkGame.patterns.length}\n` +
        `连接图案请使用\n` +
        `"连连看.连"\n` +
        `需要重排请使用\n` +
        `"连连看.重排"\n`
    );
    session.send(img);
  });

  ctx.command("连连看.结束").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!linkGame.isPlaying) return at + "游戏还没开始呢";
    linkGame.isPlaying = false;

    session.send(at + "游戏自我了断了...");
    const img = await overLinkGameDraw(session, config);
    session.send(img);
  });

  ctx.command("连连看.重排").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    const { isPlaying, table, patterns, patternColors } =
      linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (!isPlaying) return at + "游戏还没开始呢";
    table.shuffle();
    const img = await linkGameDraw(
      session,
      config,
      patterns,
      patternColors,
      table
    );
    session.send(at + "已经重新打乱顺序了~");
    session.send(img);
  });

  ctx
    .command("连连看.连")
    .alias("连")
    .action(async ({ session, args }) => {
      const at =
        config.atUser && !session.event.channel.type
          ? h.at(session.userId) + " "
          : "";
      const cid = session.cid;
      const { isPlaying, table } =
        linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
      if (!isPlaying) return at + "游戏还没开始呢";

      if (args.length % 2 !== 0) {
        session.send(at + "参数数量有问题呀");
        args.pop();
      }

      // 这部分用于把传入的数对拆分
      const pointArr = [...args];
      const pointPairArr: [LinkPoint, LinkPoint][] = [];
      while (pointArr.length > 1) {
        const p1: LinkPoint = Table.order2Point(
          Math.floor(+pointArr.shift()),
          table
        );
        const p2: LinkPoint = Table.order2Point(
          Math.floor(+pointArr.shift()),
          table
        );
        pointPairArr.push([p1, p2]);
      }
      return await checkLickGame(session, pointPairArr);
    });

  async function checkLickGame(
    session: Session,
    pointPairArr: [LinkPoint, LinkPoint][]
  ) {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    const { table, patterns, patternColors } = linkGame;

    const pathInfoArr = table.checkPointArr(config, pointPairArr);
    let truePathInfoArr = pathInfoArr.filter((v) => v.enableLink);
    let wrongPathInfoArr = pathInfoArr.filter((v) => !v.enableLink);
    if (truePathInfoArr.length === 0) {
      if (pointPairArr.length === 1) return at + pathInfoArr[0].text;
      return at + "没有可以连接的图案哦~";
    }

    while (truePathInfoArr.length > 0) {
      const removeArr: [LinkPoint, LinkPoint][] = truePathInfoArr.map(
        (info) => [info.p1, info.p2]
      );
      const linkPathArr = truePathInfoArr.map((info) => info.linkPath);
      const img = await linkGameDraw(
        session,
        config,
        patterns,
        patternColors,
        table,
        linkPathArr
      );
      await session.send(img);
      for (const [p1, p2] of removeArr) {
        table.remove(p1, p2);
      }
      const pathInfoArr = table.checkPointArr(
        config,
        wrongPathInfoArr.map((v) => [v.p1, v.p2])
      );
      truePathInfoArr = pathInfoArr.filter((v) => v.enableLink);
      wrongPathInfoArr = pathInfoArr.filter((v) => !v.enableLink);
    }

    if (table.isClear) {
      linkGame.isPlaying = false;
      const img = await winLinkGameDraw(session, config);
      session.send(img);
      return at + "所有的图案都被消除啦~";
    }
    const img2 = await linkGameDraw(
      session,
      config,
      patterns,
      patternColors,
      table
    );
    await session.send(img2);
    if (wrongPathInfoArr.length > 0) {
      const returnStr = wrongPathInfoArr
        .map(
          (v) =>
            "" +
            Table.point2Order(v.p1, table) +
            "与" +
            Table.point2Order(v.p2, table) +
            v.text
        )
        .join("\n");
      return at + "\n" + returnStr;
    }
  }
}
