import { Context, Random, Schema, Session, h } from "koishi";
import {
  Table as LinkTable,
  Point as LinkPoint,
  PathInfo as LinkPathInfo,
  Table,
} from "./linkGame";
import {
  draw as canvasDraw,
  drawWin as canvasDrawWin,
  drawWelcome as canvasDrawWelcome,
  drawOver as canvasDrawOver,
} from "./drawCanvas";
import {
  draw as puppeteerDraw,
  drawWelcome as puppeteerDrawWelcome,
} from "./drawPuppeteer";
import {} from "koishi-plugin-puppeteer";

export const inject = {
  required: ["database", "canvas"],
  optional: ["puppeteer"],
};

export const name = "fei-linkgame";

export const usage = `
可以在koishi上玩连连看~
小心不要沉迷...
`;

export interface Config {
  sideFree: boolean;
  moreSideFree: boolean;
  maxLink: number;
  blockSize: number;
  pattermType: string[];
}

export const Config: Schema<Config> = Schema.object({
  sideFree: Schema.boolean()
    .default(true)
    .description("允许在相邻边的图案更容易连接"),
  moreSideFree: Schema.boolean()
    .default(false)
    .description("允许在四周的图案更容易连接"),
  maxLink: Schema.number().default(2).description("最大转折数"),
  blockSize: Schema.number()
    .default(100)
    .description("每个格子的大小(单位是像素)"),
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
    ]),
});

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
  const winLinkGameDraw = pptrOn ? canvasDrawWin : canvasDrawWin;
  const welcomeLinkGameDraw = pptrOn ? canvasDrawWelcome : canvasDrawWelcome;
  const overLinkGameDraw = pptrOn ? canvasDrawOver : canvasDrawOver;

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
    const img = await welcomeLinkGameDraw(session, config);
    console.log(img);
    await session.send(
      img +
        `欢迎来玩...\n` +
        `KOISHI连连看~\n` +
        `指令一览：\n\n` +
        `连连看.开始\n` +
        `连连看.结束\n` +
        `连连看.重排\n` +
        `连连看.设置\n`
    );
  });

  ctx.command("连连看.设置").action(async ({ session, args }) => {
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (linkGame.isPlaying) return "游戏中不可以更改设置哦";

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
        return "参数错误";
      if (xLength < 2 || yLength < 2 || maxPatternTypes < 2) return "参数错误";
      if ((xLength * yLength) % 2 !== 0) return "格子总数要是偶数个才行..";
      if (maxPatternTypes > config.pattermType.length)
        return "我准备的图案没有那么多呀...";
      if (maxPatternTypes < 1) return "额...起码得有一种图案吧...";
      else {
        await ctx.database.set(
          "linkGameData",
          { cid: session.cid },
          { xLength, yLength, maxPatternTypes }
        );
        return "设置更改成功~";
      }
    } else return "参数数量错误";
  });

  ctx.command("连连看.开始").action(async ({ session }) => {
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (linkGame.isPlaying) return `游戏已经开始了`;

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
      return "现在图案种类比库存多...请更改设置";

    linkGame.isPlaying = true;
    const random = new Random();
    linkGame.patterns = random
      .shuffle(config.pattermType)
      .slice(0, maxPatternTypes);
    linkGame.table = new LinkTable(xLength, yLength, maxPatternTypes);
    const img = await linkGameDraw(
      session,
      config,
      linkGame.patterns,
      linkGame.table
    );
    session.send(
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
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!linkGame.isPlaying) return "游戏还没开始呢";
    linkGame.isPlaying = false;

    session.send("游戏自我了断了...");
    const img = await overLinkGameDraw(session, config);
    session.send(img);
  });

  ctx.command("连连看.重排").action(async ({ session }) => {
    const cid = session.cid;
    const { isPlaying, table, patterns } =
      linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (!isPlaying) return "游戏还没开始呢";
    table.shuffle();
    const img = await linkGameDraw(session, config, patterns, table);
    session.send("已经重新打乱顺序了~");
    session.send(img);
  });

  ctx
    .command("连连看.连")
    .alias("连")
    .action(async ({ session, args }) => {
      const cid = session.cid;
      const { isPlaying, table } =
        linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
      if (!isPlaying) return "游戏还没开始呢";

      if (args.length % 2 !== 0) return "参数数量错误";
      const pointArr = [...args];
      const pointPairArr: [LinkPoint, LinkPoint][] = [];
      while (pointArr.length > 0) {
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
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    const { table, patterns } = linkGame;

    const pathInfoArr = table.checkPointArr(config, pointPairArr);
    const truePathInfoArr = pathInfoArr.filter((v) => v.enableLink);
    const wrongPathInfoArr = pathInfoArr.filter((v) => !v.enableLink);
    if (truePathInfoArr.length === 0) return "没有可以连接的图案哦~";
    const removeArr: [LinkPoint, LinkPoint][] = truePathInfoArr.map((info) => [
      info.p1,
      info.p2,
    ]);
    const linkPathArr = truePathInfoArr.map((info) => info.linkPath);
    const img1 = await linkGameDraw(
      session,
      config,
      patterns,
      table,
      linkPathArr
    );
    await session.send(img1);
    for (const [p1, p2] of removeArr) {
      table.remove(p1, p2);
    }
    if (table.isClear) {
      linkGame.isPlaying = false;
      const img = await winLinkGameDraw(session, config);
      session.send(img);
      return "所有的图案都被消除啦~";
    }
    const img2 = await linkGameDraw(session, config, patterns, table);
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
      return returnStr;
    }
  }
}
