import { Context, Schema, Session, h } from "koishi";
import { Table as LinkTable, Point as LinkPoint } from "./linkGame";
import { draw as linkGameDraw } from "./draw";

export const name = "link-game-demo";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

class LinkGame {
  cid: string;
  isPlaying: boolean;
  table: LinkTable;
}

export function apply(ctx: Context) {
  let table = new LinkTable(3, 4);

  ctx.command("连连看")
  ctx.command("连连看.开始").action(async ({ session,args }) => {
    if (args.length !== 2) return "参数数量错误";
    if (isNaN(+args[0]) || isNaN(+args[1])) return "参数错误";
    if ((+args[0] * +args[1]) % 2 !== 0) return "参数错误，总格子数必须为偶数";
    table = new LinkTable(+args?.[0], +args?.[1]);
    const imgUrl = await linkGameDraw(session, table);
    session.send(h.img(imgUrl));
  })

  ctx.command("连连看.查看").action(async ({ session }) => {
    const imgUrl = await linkGameDraw(session, table);
    session.send(h.img(imgUrl));
  });

  ctx.command("连连看.重排").action(async ({ session }) => {
    table.shuffle();
    const imgUrl = await linkGameDraw(session, table);
    session.send(h.img(imgUrl));
    session.send("已经重新打乱顺序了~");
  })

  ctx.command("连连看.连").action(async ({ session, args }) => {
    let p1x: number, p1y: number, p2x: number, p2y: number;
    if (args.length === 4) {
      p1x = Math.floor(+args[0]);
      p1y = Math.floor(+args[1]);
      p2x = Math.floor(+args[2]);
      p2y = Math.floor(+args[3]);
    } else if (args.length === 2) {
      p1x = Math.floor(+args[0] / table.yLength) + 1;
      p1y = Math.floor(+args[0]) % table.yLength + 1;
      p2x = Math.floor(+args[1] / table.yLength) + 1;
      p2y = Math.floor(+args[1]) % table.yLength + 1;
    }
    else return "参数数量错误";
    if(isNaN(p1x) || isNaN(p1y) || isNaN(p2x) || isNaN(p2y)) return "参数错误";
    const p1 = new LinkPoint(p1x, p1y);
    const p2 = new LinkPoint(p2x, p2y);
    return await checkLickGame(session, p1, p2);
  });

  async function checkLickGame(session: Session, p1: LinkPoint, p2: LinkPoint) {
    if (!table.pattern[p1.x]?.[p1.y] || !table.pattern[p2.x]?.[p2.y]) {
      const imgUrl = await linkGameDraw(session, table);
      session.send(h.img(imgUrl));
      return "连的位置上没有图案呀";
    }
    if (table.pattern[p1.x]?.[p1.y] !== table.pattern[p2.x]?.[p2.y]) {
      const imgUrl = await linkGameDraw(session, table);
      session.send(h.img(imgUrl));
      return "这两个位置的图案不相同";
    }
    const pathInfo = table.checkPath(p1, p2);
    if (!pathInfo.enableLink) {
      const imgUrl = await linkGameDraw(session, table);
      session.send(h.img(imgUrl));
      return pathInfo.text;
    } else {
      const imgUrl1 = await linkGameDraw(session, table, ...pathInfo.linkPath);
      table.remove(p1, p2);
      const imgUrl2 = await linkGameDraw(session, table);
      await session.send(h.img(imgUrl1));
      if (table.isClear) return "游戏胜利~";
      await session.send(h.img(imgUrl2));
    }
  }
}
