import { Context, Random, Session } from "koishi";
import { config } from "../koishi/config";
import { LinkGameDraw } from "./draw";
import { LinkTable, LinkPoint, LinkPathInfo } from "./linkTable";
import { LinkGameSetting } from "./linkGameSetting";
export {
  LinkGame,
  getLinkGame,
  disposeLinkGame,
  initLinkGame,
};

interface LinkGameList {
  [key: string]: LinkGame;
}

const linkGameTemp = {
  list: {} as LinkGameList,
  ctx: Context,
  linkGameDraw: LinkGameDraw,

  init(ctx: Context) {
    this.ctx = ctx;
    this.linkGameDraw = new LinkGameDraw(this.ctx);
    return this;
  },

  create(session: Session): LinkGame {
    const cid = session.cid;
    const linkGame = new LinkGame(session);
    linkGame.draw = this.linkGameDraw;
    this.list[cid] = linkGame;
    return linkGame;
  },

  getorCreate(session: Session): LinkGame {
    const cid = session.cid;
    const linkGame = this.list[cid];
    if (!linkGame) return this.create(session);
    return linkGame;
  },

  get(cid: string) {
    return this.list[cid];
  },

  clear(cid: string) {
    const linkGame = this.list[cid];
    if (!linkGame) return false;
    linkGame.clear && linkGame.clear();
    return true;
  },

  clearAll() {
    if (!this.list) return false;
    for (const key in this.list) {
      this.clear(key);
    }
    return true;
  },
};

function initLinkGame(ctx: Context) {
  return linkGameTemp.init(ctx);
}

function getLinkGame(session: Session) {
  return linkGameTemp.getorCreate(session);
}

function disposeLinkGame() {
  return linkGameTemp.clearAll();
}

class LinkGame {
  cid: string;
  ctx: Context;
  setting: LinkGameSetting;
  data: LinkGameData;
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
    this.addMsgBreak = config.addBreak ? "<message/>" : "\n";
    this.isPlaying = false;
  }

  async settingChange(ctx: Context) {
    this.setting = await LinkGameSetting.getorCreate(ctx, this.cid);
  }

  async welcome() {
    this.settingChange(this.ctx);
    this.data = await LinkGameData.getorCreate(this.ctx, this.cid);
    const img = await this.draw.welcome();
    const maxScore = this.data.maxScore;
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
    this.setting = await LinkGameSetting.getorCreate(session.app, this.cid);

    this.lastSession = session;
    const patternCounts = this.setting.patternCounts;
    const xLength = this.setting.xLength;
    const yLength = this.setting.yLength;
    const timeLimitOn = this.setting.timeLimitOn;

    this.isPlaying = true;
    this.patterns = Random.shuffle(
      config.patternLibrary as string[]
    ).slice(0, patternCounts);
    this.patternColors = [];
    for (let i = 0; i < patternCounts; i++) {
      this.patternColors.push(config.lineColor);
    }
    this.table = new LinkTable( xLength, yLength, patternCounts);
    if (timeLimitOn) {
      this.startTime = Date.now();
      this.timeLimit = (xLength * yLength * config.timeLimitEachPair) / 2;
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
    if (this.setting.patternCounts > config.patternLibrary.length) {
      return "现在图案种类比库存多...请更改设置";
    }
    await this.newGame(session);

    const img = await this.draw.game(this, this.table);
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
    this.startTime = null;
    this.timeLimit = null;
    this.combo = 0;
    this.score = 0;
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

  async stop(session: Session) {
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
    const linkGameData = this.data;
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
      "已经重新打乱顺序了~" +
      this.addMsgBreak +
      (await this.draw.game(this, this.table))
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

  async link(session: Session, args: string[]) {
    if (!this.isPlaying) return;
    let returnMessage = "";

    if (args.length % 2 !== 0) {
      returnMessage += "参数数量有问题呀";
      returnMessage += this.addMsgBreak;
      args.pop();
    }

    // 把传入的数拆分成点对
    const pointArr = [...args];
    const pointPairArr: [LinkPoint, LinkPoint][] = [];
    while (pointArr.length > 1) {
      const p1: LinkPoint = LinkTable.order2Point(
        Math.floor(+pointArr.shift()),
        this.table
      );
      const p2: LinkPoint = LinkTable.order2Point(
        Math.floor(+pointArr.shift()),
        this.table
      );
      pointPairArr.push([p1, p2]);
    }
    returnMessage += await this.checkLick(session, pointPairArr);

    return returnMessage;
  }

  async comboTime(count: number): Promise<string> {
    if (!this.isPlaying || !this.setting.timeLimitOn) return;
    let addScore = 0;
    for (let i = 0; i < count; i++) {
      addScore += 10 * 2 ** this.combo;
      this.combo++;
    }
    this.lastLinkTime = Date.now();
    this.score += addScore;
    return `${this.combo}连击！ 得分 ${addScore}` + this.addMsgBreak;
  }

  async checkLick(session: Session, pointPairArr: [LinkPoint, LinkPoint][]) {
    let returnMessage = "";
    const table = this.table;
    const pathInfoArrArr = await table.linkCheck(pointPairArr);

    for (const pathInfoArr of pathInfoArrArr) {
      if (pathInfoArr[0].enableLink) {
        returnMessage += this.draw.game(
          this,
          table,
          pathInfoArr.map((info: LinkPathInfo) => info.linkPath)
        );
        returnMessage += this.addMsgBreak;
        returnMessage += await this.comboTime(pathInfoArr.length);
      } else {
        returnMessage +=
          LinkTable.point2Order(pathInfoArr[0].p1, table) +
          "与" +
          LinkTable.point2Order(pathInfoArr[0].p2, table) +
          pathInfoArr[0].text +
          this.addMsgBreak;
        this.combo = 0;
      }
    }

    if (table.isClear) {
      returnMessage += await this.win(session);
      return returnMessage;
    } else {
      returnMessage += "当前得分 " + this.score;
      return returnMessage;
    }
  }
}


class LinkGameData {
  cid: string;
  maxScore: number;
  constructor(cid: string) {
    this.cid = cid;
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
