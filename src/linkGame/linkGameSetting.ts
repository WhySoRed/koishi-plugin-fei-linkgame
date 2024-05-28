import { Context, Session } from "koishi";
import { LinkGame, getLinkGame } from "./linkGame";
import { Config } from "../koishi/config";
export { showSetting, settingChange, LinkGameSetting };

let ctx: Context;
let config: Config;

type SettingName = "尺寸" | "图案数" | "限时" | "重置";
class SettingChangeInfo {
  success: boolean;
  message: string;
  constructor(success: boolean, message: string) {
    this.success = success;
    this.message = message;
  }
}
class LinkGameSetting {
  cid: string;
  xLength: number;
  yLength: number;
  patternCounts: number;
  timeLimitOn: boolean;
  constructor(cid: string) {
    this.cid = cid;
    this.xLength = 5;
    this.yLength = 6;
    this.patternCounts = 9;
    this.timeLimitOn = true;
  }
  // 获取数据库数据，没有则创建
  static async getorCreate(ctx: Context, cid: string) {
    const linkGameSetting = (
      await ctx.database.get("linkGameSetting", { cid })
    )[0];
    if (!linkGameSetting) {
      const linkGameSetting = new LinkGameSetting(cid);
      await ctx.database.create("linkGameSetting", linkGameSetting);
      return linkGameSetting;
    } else return linkGameSetting;
  }
  static async update(ctx: Context, linkGameSetting: LinkGameSetting) {
    await ctx.database.upsert("linkGameSetting", [linkGameSetting]);
    return linkGameSetting;
  }
}

async function showSetting(session: Session) {
  const cid = session.cid;
  config = session.app.config;
  const linkGameSetting = await LinkGameSetting.getorCreate(ctx, cid);
  return (
    `当前设置：\n` +
    `每列图案个数：${linkGameSetting.xLength}\n` +
    `每行图案个数：${linkGameSetting.yLength}\n` +
    `当前图案库存数：${config.patternLibrary.length}\n` +
    `是否开启限时模式：${linkGameSetting.timeLimitOn ? "是" : "否"}\n` +
    `当前每局图案最大数量：${linkGameSetting.patternCounts}\n\n` +
    `查看设置指令请发送\n` +
    `help 连连看.设置`
  );
}

async function settingChange(
  session: Session,
  settingName: SettingName,
  ...args: string[]
) {
  ctx = session.app;
  config = ctx.config;
  const linkGame = getLinkGame(session);

  let returnMessage = "";

  if (linkGame.isPlaying) returnMessage = "游戏中不可以更改设置哦";
  else if (settingName === "尺寸") {
    const settingChangeInfo = await settingChangeSize(linkGame, ...args);
    returnMessage = settingChangeInfo.message;
  } else if (settingName === "图案数") {
    const settingChangeInfo = await settingChangePatternCounts(
      linkGame,
      ...args
    );
    returnMessage = settingChangeInfo.message;
  } else if (settingName === "限时") {
    const settingChangeInfo = await settingChangeTimeLimit(linkGame);
    returnMessage = settingChangeInfo.message;
  } else if (settingName === "重置") {
    const settingChangeInfo = await settingReset(linkGame);
    returnMessage = settingChangeInfo.message;
  }
  await linkGame.settingChange(ctx);
  return returnMessage;
}

async function settingChangeSize(
  linkGame: LinkGame,
  ...args: string[]
): Promise<SettingChangeInfo> {
  if (args.length !== 2) return new SettingChangeInfo(false, "参数数量错误");
  const xLength = Math.floor(+args[0]);
  const yLength = Math.floor(+args[1]);
  if (isNaN(xLength) || isNaN(yLength))
    return new SettingChangeInfo(false, "高和宽需要是数字才行...");
  if (xLength < 1 || yLength < 1)
    return new SettingChangeInfo(false, "高和宽需要是正数才行...");
  if ((xLength * yLength) % 2 !== 0)
    return new SettingChangeInfo(false, "格子总数要是偶数个呀..");
  const linkGameSetting = await LinkGameSetting.getorCreate(ctx, linkGame.cid);
  linkGameSetting.xLength = xLength;
  linkGameSetting.yLength = yLength;
  await LinkGameSetting.update(ctx, linkGameSetting);
  return new SettingChangeInfo(
    true,
    "尺寸更改成功~，当前尺寸为" + xLength + "x" + yLength
  );
}

async function settingChangePatternCounts(
  linkGame: LinkGame,
  ...args: string[]
): Promise<SettingChangeInfo> {
  if (args.length !== 1) return new SettingChangeInfo(false, "参数数量错误");
  const patternCounts = Math.floor(+args[0]);
  if (isNaN(patternCounts)) return new SettingChangeInfo(false, "参数错误");
  if (patternCounts > config.patternLibrary.length)
    return new SettingChangeInfo(false, "我准备的图案没有那么多呀...");
  if (patternCounts < 1)
    return new SettingChangeInfo(false, "额...起码得有一种图案吧...");
  const linkGameSetting = await LinkGameSetting.getorCreate(ctx, linkGame.cid);
  linkGameSetting.patternCounts = patternCounts;
  await LinkGameSetting.update(ctx, linkGameSetting);
  return new SettingChangeInfo(
    true,
    "图案数更改成功~，当前图案数为" + patternCounts
  );
}

async function settingChangeTimeLimit(linkGame: LinkGame) {
  const linkGameSetting = await LinkGameSetting.getorCreate(ctx, linkGame.cid);
  linkGameSetting.timeLimitOn = !linkGameSetting.timeLimitOn;
  await LinkGameSetting.update(ctx, linkGameSetting);
  if (linkGameSetting.timeLimitOn) {
    return new SettingChangeInfo(true, "禅模式关闭~\n限时但是会计算分数哦");
  } else {
    linkGame.startTime = null;
    linkGame.timeLimit = null;
    return new SettingChangeInfo(true, "禅模式开启~\n不限时但是不会计算分数哦");
  }
}

async function settingReset(linkGame: LinkGame) {
  const linkGameSetting = new LinkGameSetting(linkGame.cid);
  await LinkGameSetting.update(ctx, linkGameSetting);
  return new SettingChangeInfo(true, "重置成功~");
}
