import { Context, Schema, Session, h } from "koishi";
import { Table as LinkTable, Point as LinkPoint } from "./link-class";
import { draw as linkGameDraw } from "./draw";

export const name = "link-game-demo";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  const table = new LinkTable(3, 4);

  ctx.command("link测试").action(async ({ session }) => {
    const imgUrl = await linkGameDraw(session, table);
    session.send(h.img(imgUrl));
  })

  ctx.command("link测试2").action(async ({ session, args }) => {
    const p1 = new LinkPoint(
      Math.floor(+args[0] - 1),
      Math.floor(+args[1] - 1)
    );
    const p2 = new LinkPoint(
      Math.floor(+args[2] - 1),
      Math.floor(+args[3] - 1)
    );
    return await checkLickGame(session,p1,p2);
  })

  async function checkLickGame(session:Session, p1:LinkPoint, p2:LinkPoint) {
    if(!table.pattern[p1.x][p1.y] || !table.pattern[p2.x][p2.y]){
      return("连的位置上没有图案呀");
    }
    if(table.pattern[p1.x][p1.y] !== table.pattern[p2.x][p2.y]){
      return ("这两个位置的图案不相同");
    }
    const pathInfo = table.checkPath(p1, p2);
    console.log("lp:" + JSON.stringify(pathInfo));
    if (!pathInfo.enableLink) {
      session.send("这两个位置无法连接");
    } else {
      let imgUrl = await linkGameDraw(session, table, ...pathInfo.linkPath);
      await session.send(h.img(imgUrl));
      table.remove(p1,p2);
      imgUrl = await linkGameDraw(session, table);
      await session.send(h.img(imgUrl));
    }
    if(table.isClear) return ("游戏胜利~");
  }

}
