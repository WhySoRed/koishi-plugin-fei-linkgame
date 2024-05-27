import { Context, Session } from "koishi";
import { LinkGame, LinkGameData } from "./linkGameMethod";
import { Config } from "../koishi/config";
import { linkGameTemp } from "../command";

export { showSetting, settingChange };

type SettingName = "尺寸" | "图案数" | "限时" | "重置";
class SettingChangeInfo {
  success: boolean;
  message: string;
  constructor(success: boolean, message: string) {
    this.success = success;
    this.message = message;
  }
}

let ctx: Context;
let config: Config;

async function showSetting(session: Session) {
  const cid = session.cid;
  const linkGameData = await LinkGameData.getorCreate(ctx, cid);
  return (
    `当前设置：\n` +
    `每列图案个数：${linkGameData.xLength}\n` +
    `每行图案个数：${linkGameData.yLength}\n` +
    `当前图案库存数：${config.patternLibrary.length}\n` +
    `是否开启限时模式：${linkGameData.timeLimitOn ? "是" : "否"}\n` +
    `当前每局图案最大数量：${linkGameData.patternCounts}\n\n` +
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
  const cid = session.cid;
  const linkGame = await linkGameTemp.getorCreate(session);

  if (linkGame.isPlaying) return " 游戏中不可以更改设置哦";
  if (settingName === "尺寸") {
    const settingChangeInfo = await settingChangeSize(linkGame, ...args);
    return settingChangeInfo.message;
  }
  if (settingName === "图案数") {
    const settingChangeInfo = await settingChangePatternCounts(
      linkGame,
      ...args
    );
    return settingChangeInfo.message;
  }
  if (settingName === "限时") {
    const settingChangeInfo = await settingChangeTimeLimit(linkGame);
    return settingChangeInfo.message;
  }
  if (settingName === "重置") {
    const settingChangeInfo = await settingReset(linkGame);
    return settingChangeInfo.message;
  }
  return "参数错误";
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
  const linkGameData = await LinkGameData.getorCreate(ctx, linkGame.cid);
  linkGameData.xLength = xLength;
  linkGameData.yLength = yLength;
  await LinkGameData.update(ctx, linkGameData);
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
  const linkGameData = await LinkGameData.getorCreate(ctx, linkGame.cid);
  linkGameData.patternCounts = patternCounts;
  await LinkGameData.update(ctx, linkGameData);
  return new SettingChangeInfo(
    true,
    "图案数更改成功~，当前图案数为" + patternCounts
  );
}

async function settingChangeTimeLimit(linkGame: LinkGame) {
  const linkGameData = await LinkGameData.getorCreate(ctx, linkGame.cid);
  linkGameData.timeLimitOn = !linkGameData.timeLimitOn;
  await LinkGameData.update(ctx, linkGameData);
  if (linkGameData.timeLimitOn) {
    return new SettingChangeInfo(true, "禅模式关闭~\n限时但是会计算分数哦");
  } else {
    linkGame.startTime = null;
    linkGame.timeLimit = null;
    return new SettingChangeInfo(true, "禅模式开启~\n不限时但是不会计算分数哦");
  }
}

async function settingReset(linkGame: LinkGame) {
  const linkGameData = new LinkGameData(linkGame.cid);
  await LinkGameData.update(ctx, linkGameData);
  return new SettingChangeInfo(true, "重置成功~");
}
