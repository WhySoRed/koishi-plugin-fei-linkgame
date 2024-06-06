import { Context, Session, h } from "koishi";
import { config } from "./koishi/config";
import { getLinkGame } from "./linkGame/linkGame";
import { showSetting, settingChange } from "./linkGame/linkGameSetting";
export { registerCommand };

async function registerCommand(ctx: Context) {
  // 根据设置确定是否需要添加at
  function addAt(session: Session) {
    if (config.atUser && !session.event.channel.type) {
      return h.at(session.userId) + " ";
    }
    return "";
  }

  ctx.command("连连看").action(async ({ session }) => {
    const linkGame = getLinkGame(session);
    return addAt(session) + (await linkGame.welcome());
  }).usage("来玩连连看吧~");

  ctx.command("连连看.设置").action(async ({ session }) => {
    return addAt(session) + (await showSetting(session));
  });

  ctx.command("连连看.设置.尺寸").action(async ({ session, args }) => {
    return addAt(session) + (await settingChange(session, "尺寸", ...args));
  }).usage("设置连连看的棋盘大小");

  ctx.command("连连看.设置.图案数").action(async ({ session, args }) => {
    return addAt(session) + (await settingChange(session, "图案数", ...args));
  });
  ctx.command("连连看.设置.限时").action(async ({ session }) => {
    return addAt(session) + (await settingChange(session, "限时"));
  });

  ctx.command("连连看.设置.重置").action(async ({ session }) => {
    return addAt(session) + (await settingChange(session, "重置"));
  });

  ctx.command("连连看.开始").action(async ({ session }) => {
    const linkGame = getLinkGame(session);
    return addAt(session) + (await linkGame.start(session));
  });

  ctx.command("连连看.结束").action(async ({ session }) => {
    const linkGame = getLinkGame(session);
    return addAt(session) + (await linkGame.stop(session));
  });

  ctx.command("连连看.重排").action(async ({ session }) => {
    const linkGame = getLinkGame(session);
    return addAt(session) + (await linkGame.shuffle(session));
  });

  ctx
    .command("连连看.连")
    .alias("连")
    .action(async ({ session, args }) => {
      const linkGame = getLinkGame(session);
      const linkResult = await linkGame.link(session, args);
      if (linkResult) return addAt(session) + linkResult;
      else return;
    });
}
