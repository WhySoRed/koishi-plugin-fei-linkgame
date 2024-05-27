import { Context, Random, Session } from "koishi";
import { Config } from "../koishi/config";
import { LinkGameDraw } from "./draw";
import { LinkTable } from "./table";

export { LinkGame, LinkGameData };

type Setting = LinkGameData;
class LinkGame {
  cid: string;
  ctx: Context;
  config: Config;
  setting: Setting;
  addMsgBreak: string;
  draw: LinkGameDraw;
  isPlaying: boolean;
  patterns: string[];
  patternColors: string[];
  table: LinkTable;
  lastLinkTime: number;
  combo: number;
  startTime: number;
  timeLimit: number;
  get timeLeft(): number {
    return this.timeLimit - (Date.now() - this.startTime);
  }
  score: number;
  lastSession: Session;
  timeLimitTimer: () => void;

  constructor(session: Session) {
    this.cid = session.cid;
    this.ctx = session.app;
    this.config = this.ctx.config;
    this.addMsgBreak = this.config.addBreak ? "<message/>" : "\n";
    this.draw = new LinkGameDraw(this.ctx);
    this.isPlaying = false;
  }

  async settingChange(ctx: Context) {
    this.setting = await LinkGameData.getorCreate(ctx, this.cid);
  }

  async welcome() {
    this.settingChange(this.ctx);
    const img = await this.draw.welcome();
    const maxScore = this.setting.maxScore;
    let returnMessage =
      img +
      `一起来玩...\n` +
      `KOISHI连连看~\n` +
      `指令一览：\n\n` +
      `连连看.开始\n` +
      `连连看.结束\n` +
      `连连看.重排\n` +
      `连连看.设置\n` +
      `连连看.连`;
    if (maxScore) {
      returnMessage += `\n\n` + `本对话目前最高分：${maxScore}~`;
    }
    return returnMessage;
  }

  async newGame(session: Session) {
    this.ctx = session.app;
    this.config = this.ctx.config;
    this.setting = await LinkGameData.getorCreate(session.app, this.cid);

    this.lastSession = session;
    const patternCounts = this.setting.patternCounts;
    const xLength = this.setting.xLength;
    const yLength = this.setting.yLength;
    const timeLimitOn = this.setting.timeLimitOn;

    this.isPlaying = true;
    this.patterns = Random.shuffle(
      this.config.patternLibrary as string[]
    ).slice(0, patternCounts);
    this.patternColors = [];
    for (let i = 0; i < patternCounts; i++) {
      this.patternColors.push(this.config.lineColor);
    }
    this.table = new LinkTable(xLength, yLength, patternCounts);
    if (timeLimitOn) {
      this.startTime = Date.now();
      this.timeLimit = (xLength * yLength * this.config.timeLimitEachPair) / 2;
      this.timeLimitTimer = session.app.setTimeout(
        async () => this.timeOut(session),
        this.timeLimit
      );
    }
  }

  async start(session: Session) {
    if (this.isPlaying) {
      return "游戏已经开始了";
    }
    if (this.setting.patternCounts > this.config.patternLibrary.length) {
      return "现在图案种类比库存多...请更改设置";
    }
    await this.newGame(session);

    const img = await this.draw.game(this);
    return (
      `游戏开始咯~\n` +
      `大小${this.table.xLength}x${this.table.yLength} 图案数${this.setting.patternCounts}\n` +
      `连接图案请使用\n` +
      `"连连看.连"\n` +
      `需要重排请使用\n` +
      `"连连看.重排"` +
      this.addMsgBreak +
      img
    );
  }

  clear() {
    this.timeLimitTimer && this.timeLimitTimer();
    this.isPlaying = false;
    this.patterns = [];
    this.patternColors = [];
    this.table = null;
    this.lastLinkTime = null;
    this.combo = 0;
    this.startTime = null;
    this.timeLimit = null;
    this.score = 0;
    this.lastSession = null;
  }

  async gameOver(text: string) {
    const returnMessage: string =
      text +
      (await this.scoreRecord()) +
      this.addMsgBreak +
      (await this.draw.over());
    this.clear();
    return returnMessage;
  }

  async end(session: Session) {
    if (!this.isPlaying) {
      return "游戏还没开始呢";
    }
    return await this.gameOver("游戏自我了断了...\n");
  }

  async timeOut(session: Session) {
    const message = await this.gameOver("时间结束了呀...\n");
    try {
      session.send(message);
    } catch (e) {
      try {
        this.lastSession.send(message);
      } catch (e) {
        try {
          session.bot.sendMessage(session.channelId, message);
        } catch (e) {}
      }
    }
  }

  async scoreRecord() {
    if (!this.score) return "";
    const linkGameData = this.setting;
    if (linkGameData[0].maxScore < this.score) {
      linkGameData.maxScore = this.score;
      await LinkGameData.update(this.ctx, linkGameData);
      return `本局得分：${this.score}\n新纪录~`;
    } else return `本局得分：${this.score}`;
  }

  async shuffle(session: Session) {
    this.lastSession = session;
    this.combo = 0;
    if (!this.isPlaying) {
      return "游戏还没开始呢";
    }
    this.table.shuffle();
    return (
      "已经重新打乱顺序了~" + this.addMsgBreak + (await this.draw.game(this))
    );
  }

  async win(session: Session) {
    const returnMessage: string =
      (await this.draw.win()) +
      this.addMsgBreak +
      "所有的图案都被消除啦~" +
      this.addMsgBreak +
      this.scoreRecord();
    this.clear();
    return returnMessage;
  }
}

class LinkGameData {
  cid: string;
  xLength: number;
  yLength: number;
  patternCounts: number;
  timeLimitOn: boolean;
  maxScore: number;
  constructor(cid: string) {
    this.cid = cid;
    this.xLength = 5;
    this.yLength = 6;
    this.patternCounts = 9;
    this.timeLimitOn = true;
    this.maxScore = 0;
  }
  // 获取数据库数据，没有则创建
  static async getorCreate(ctx: Context, cid: string) {
    const linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    if (!linkGameData) {
      const linkGameData = new LinkGameData(cid);
      await ctx.database.create("linkGameData", linkGameData);
      return linkGameData;
    } else return linkGameData;
  }

  static async update(ctx: Context, linkGameData: LinkGameData) {
    await ctx.database.upsert("linkGameData", [linkGameData]);
    return linkGameData;
  }
}