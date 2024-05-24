import { Context, Schema, h } from "koishi";
import { Table as LinkTable, Point as LinkPoint } from "./link-class";
import { draw as linkGameDraw } from "./draw";

export const name = "link-game-demo";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  // write your plugin here
  const table = new LinkTable(8, 6);
  ctx.command("link测试").action(async ({ session }) => {
    const imgUrl = await linkGameDraw(session, table);
    session.send(h.img(imgUrl));
  });

  ctx.command("link测试2").action(async ({ session, args }) => {
    const p1 = new LinkPoint(
      Math.floor(+args[0] - 1),
      Math.floor(+args[1] - 1)
    );
    const p2 = new LinkPoint(
      Math.floor(+args[2] - 1),
      Math.floor(+args[3] - 1)
    );
    const pathInfo = table.checkPath(p1, p2);
    console.log("lp:" + JSON.stringify(pathInfo));
    if (!pathInfo) {
      session.send("无法连接");
    } else {
      const imgUrl = await linkGameDraw(session, table, ...pathInfo.linkPath);
      session.send(h.img(imgUrl));
    }
  });
}
