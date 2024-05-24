import { Context, Schema, Session, h } from "koishi";
import { Table as LinkTable, Point as LinkPoint } from "./linkGame";
import { draw as linkGameDraw, drawWin as winLinkGameDraw } from "./draw";

export const inject = {
  required: ["database"],
};

export const name = "link-game-demo";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

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
  table: LinkTable;
}

export function apply(ctx: Context) {

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

  ctx.command("连连看");

  ctx.command("连连看.设置").action(async ({ session,args }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (channelGame.isPlaying) return "游戏中不可以更改设置哦";

    let linkGameData = (await ctx.database.get("linkGameData", {cid:session.cid}))[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", {cid:session.cid});
      linkGameData = (await ctx.database.get("linkGameData", {cid:session.cid}))[0];
    }
    const xLength = linkGameData.xLength;
    const yLength = linkGameData.yLength;
    const maxPatternTypes = linkGameData.maxPatternTypes;
    if (args.length === 0) {
      return (
        `当前设置：\n`+
        `行数:${xLength}\n` +
        `列数:${yLength}\n` +
        `图案种类最大数量:${maxPatternTypes}\n`
    )
    }
  });

  ctx.command("连连看.开始").action(async ({ session }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (channelGame.isPlaying) return "游戏已经开始了";

    let linkGameData = (await ctx.database.get("linkGameData", {cid:session.cid}))[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", {cid:session.cid});
      linkGameData = (await ctx.database.get("linkGameData", {cid:session.cid}))[0];
    }

    const xLength = linkGameData.xLength;
    const yLength = linkGameData.yLength;
    const maxPatternTypes = linkGameData.maxPatternTypes;


    channelGame.isPlaying = true;
    //游戏过程中的快捷指令
    channelGame.listener = ctx
      .channel(session.channelId)
      .on("message", async (session) => {
        if (session.content.startsWith("连")) {
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
    channelGame.table = new LinkTable(xLength, yLength, maxPatternTypes);
    const imgUrl = await linkGameDraw(session, channelGame.table);

    session.send(h.img(imgUrl));
  });

  ctx.command("连连看.结束").action(async ({ session }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!channelGame.isPlaying) return "游戏还没开始呢";
    channelGame.isPlaying = false;
    channelGame.listener && channelGame.listener();
    return "游戏结束了~";
  });
  ctx.command("连连看.重排").action(async ({ session }) => {
    const channelGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!channelGame.isPlaying) return "游戏还没开始呢";
    channelGame.table.shuffle();
    const imgUrl = await linkGameDraw(session, channelGame.table);
    session.send(h.img(imgUrl));
    return "已经重新打乱顺序了~";
  });

  ctx.command("连连看.连").action(async ({ session, args }) => {
    console.log(args);
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
      const imgUrl = await linkGameDraw(session, channelGame.table);
      session.send(h.img(imgUrl));
      return "选择的位置上没有图案呀";
    }
    if (
      channelGame.table.pattern[p1.x]?.[p1.y] !==
      channelGame.table.pattern[p2.x]?.[p2.y]
    ) {
      const imgUrl = await linkGameDraw(session, channelGame.table);
      session.send(h.img(imgUrl));
      return "这两个位置的图案不相同";
    }
    const pathInfo = channelGame.table.checkPath(p1, p2);
    if (!pathInfo.enableLink) {
      const imgUrl = await linkGameDraw(session, channelGame.table);
      session.send(h.img(imgUrl));
      return pathInfo.text;
    } else {
      const imgUrl1 = await linkGameDraw(
        session,
        channelGame.table,
        ...pathInfo.linkPath
      );
      channelGame.table.remove(p1, p2);
      const imgUrl2 = await linkGameDraw(session, channelGame.table);
      await session.send(h.img(imgUrl1));
      if (channelGame.table.isClear) {
        channelGame.isPlaying = false;
        channelGame.listener && channelGame.listener();
        const imgUrl = await winLinkGameDraw(session);
        session.send(h.img(imgUrl));
        return "所有的图案都被消除啦~";
      }
      await session.send(h.img(imgUrl2));
    }
  }
}
