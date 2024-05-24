import { Context, Random, Schema, Session, h } from "koishi";
import { Table as LinkTable, Point as LinkPoint } from "./linkGame";
import {
  draw as linkGameDraw,
  drawWin as winLinkGameDraw,
  drawWelcome as welcomeLinkGameDraw,
  drawOver as overLinkGameDraw,
} from "./draw";

export const inject = {
  required: ["database", "canvas"],
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
    .default(["😀", "❤️", "💎", "⚡", "🌸", "🐇", "⏰", "🍎", "🚀", "🎻"]),
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
  listener: () => void;
  patterns: string[];
  lastLinkTime: number;
  table: LinkTable;
}

export function apply(ctx: Context, config: Config) {
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

  ctx.on("dispose", () => {
    for (const key in linkGameTemp) {
      linkGameTemp[key].listener && linkGameTemp[key].listener();
    }
  });

  ctx.command("连连看").action(async ({ session }) => {
    const imgUrl = await welcomeLinkGameDraw(session, config);
    await session.send(
      h.img(imgUrl) +
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
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (channelGame.isPlaying) return "游戏中不可以更改设置哦";

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
    // TODO: 把这个用图片输出
    if (args.length === 0) {
      return (
        `当前设置：\n` +
        `每列图案个数：${xLength}\n` +
        `每行图案个数：${yLength}\n` +
        `当前图案库存数：${config.pattermType.length}\n` +
        `当前每局图案最大数量：${maxPatternTypes}\n\n` +
        `想要修改设置请使用指令：\n` +
        `连连看.设置 [每行个数] [每列个数] [种类数]`
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
      else {
        await ctx.database.set(
          "linkGameData",
          { cid: session.cid },
          { xLength, yLength, maxPatternTypes }
        );
        return "设置更改成功~";
      }
    }
  });

  ctx.command("连连看.开始").action(async ({ session }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (channelGame.isPlaying) return `游戏已经开始了`;

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

    channelGame.isPlaying = true;
    //游戏过程中的快捷指令
    channelGame.listener = ctx
      .channel(session.channelId)
      .on("message", async (session) => {
        if (
          session.content.startsWith("连") &&
          !session.content.startsWith("连连看")
        ) {
          session.execute(
            "连连看.连 " +
              session.content
                .slice(1)
                .split(" ")
                .filter((v) => v !== "")
                .join(" ")
          );
        }
      });
    const random = new Random();
    channelGame.patterns = random
      .shuffle(config.pattermType)
      .slice(0, maxPatternTypes);
    channelGame.table = new LinkTable(xLength, yLength, maxPatternTypes);
    const imgUrl = await linkGameDraw(
      session,
      config,
      channelGame.patterns,
      channelGame.table
    );
    session.send(
      `游戏开始咯~\n` +
        `大小${channelGame.table.xLength}x${channelGame.table.yLength} 图案数${channelGame.patterns.length}\n` +
        `连接图案请使用\n` +
        `"连连看.连"\n` +
        `需要重排请使用\n` +
        `"连连看.重排"\n`
    );
    session.send(h.img(imgUrl));
  });

  ctx.command("连连看.结束").action(async ({ session }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!channelGame.isPlaying) return "游戏还没开始呢";
    channelGame.isPlaying = false;
    channelGame.listener && channelGame.listener();

    session.send("游戏自我了断了...");
    const imgUrl = await overLinkGameDraw(session, config);
    session.send(h.img(imgUrl));
  });
  ctx.command("连连看.重排").action(async ({ session }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!channelGame.isPlaying) return "游戏还没开始呢";
    channelGame.table.shuffle();
    const imgUrl = await linkGameDraw(
      session,
      config,
      channelGame.patterns,
      channelGame.table
    );
    session.send(h.img(imgUrl));
    return "已经重新打乱顺序了~";
  });

  ctx.command("连连看.连").action(async ({ session, args }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!channelGame.isPlaying) return "游戏还没开始呢";
    let p1x: number, p1y: number, p2x: number, p2y: number;
    if (args.length === 4) {
      p1x = Math.floor(+args[0]);
      p1y = Math.floor(+args[1]);
      p2x = Math.floor(+args[2]);
      p2y = Math.floor(+args[3]);
    } else if (args.length === 2) {
      p1x = Math.floor(+args[0] / channelGame.table.yLength) + 1;
      p1y = (Math.floor(+args[0]) % channelGame.table.yLength) + 1;
      p2x = Math.floor(+args[1] / channelGame.table.yLength) + 1;
      p2y = (Math.floor(+args[1]) % channelGame.table.yLength) + 1;
    } else return "参数数量错误";
    if (isNaN(p1x) || isNaN(p1y) || isNaN(p2x) || isNaN(p2y)) return "参数错误";
    const p1 = new LinkPoint(p1x, p1y);
    const p2 = new LinkPoint(p2x, p2y);
    return await checkLickGame(session, p1, p2);
  });

  async function checkLickGame(session: Session, p1: LinkPoint, p2: LinkPoint) {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (
      !channelGame.table.pattern[p1.x]?.[p1.y] ||
      !channelGame.table.pattern[p2.x]?.[p2.y]
    ) {
      const imgUrl = await linkGameDraw(
        session,
        config,
        channelGame.patterns,
        channelGame.table
      );
      session.send(h.img(imgUrl));
      return "选择的位置上没有图案呀";
    }
    if (
      channelGame.table.pattern[p1.x]?.[p1.y] !==
      channelGame.table.pattern[p2.x]?.[p2.y]
    ) {
      const imgUrl = await linkGameDraw(
        session,
        config,
        channelGame.patterns,
        channelGame.table
      );
      session.send(h.img(imgUrl));
      return "这两个位置的图案不相同";
    }
    const pathInfo = channelGame.table.checkPath(config, p1, p2);
    if (!pathInfo.enableLink) {
      const imgUrl = await linkGameDraw(
        session,
        config,
        channelGame.patterns,
        channelGame.table
      );
      session.send(h.img(imgUrl));
      return pathInfo.text;
    } else {
      const imgUrl1 = await linkGameDraw(
        session,
        config,
        channelGame.patterns,
        channelGame.table,
        [pathInfo.linkPath]
      );
      channelGame.table.remove(p1, p2);
      const imgUrl2 = await linkGameDraw(
        session,
        config,
        channelGame.patterns,
        channelGame.table
      );
      await session.send(h.img(imgUrl1));
      if (channelGame.table.isClear) {
        channelGame.isPlaying = false;
        channelGame.listener && channelGame.listener();
        const imgUrl = await winLinkGameDraw(session, config);
        session.send(h.img(imgUrl));
        return "所有的图案都被消除啦~";
      }
      await session.send(h.img(imgUrl2));
    }
  }
}
