import { Context, Random, Session, h } from "koishi";
import { Config } from "./koishi/config";
import {
  LinkTable,
  LinkPoint,
  LinkPathInfo,
  LinkGame,
  LinkGameData,
} from "./linkGame/class";
import { LinkGameDraw } from "./linkGame/draw";
import { showSetting, settingChange } from "./linkGame/setting";

export { linkGameTemp, command };

interface LinkGameList {
  [key: string]: LinkGame;
}

const linkGameTemp = {
  list: {} as LinkGameList,

  create(cid: string) {
    const linkGame = new LinkGame(cid);
    this.list[cid] = linkGame;
    return linkGame;
  },

  getorCreate(cid: string) {
    const linkGame = this.list[cid];
    if (!linkGame) return this.create(cid);
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

async function command(ctx: Context, config: Config) {
  const linkGameDraw = new LinkGameDraw(ctx);

  // 根据设置确定是否需要添加at
  function addAt(session: Session) {
    if (config.atUser && !session.event.channel.type) {
      return h.at(session.userId) + " ";
    }
    return "";
  }

  // 根据设置确定是否需要将消息多次发送
  function addMsgBreak() {
    if (config.addBreak) return "<message/>";
    return "";
  }

  ctx.command("连连看").action(async ({ session }) => {
    const cid = session.cid;
    const img = await linkGameDraw.welcome(config);
    const maxScore = (await LinkGameData.getorCreate(ctx, cid)).maxScore;
    let returnMessage =
      img +
      addAt(session) +
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
  });

  ctx.command("连连看.设置").action(async ({ session }) => {
    return addAt(session) + (await showSetting(session));
  });

  ctx.command("连连看.设置.尺寸").action(async ({ session, args }) => {
    return addAt(session) + (await settingChange(session, "尺寸", ...args));
  });

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
    const cid = session.cid;
    let returnMessage = addAt(session);

    const linkGame = linkGameTemp.getorCreate(cid);

    if (linkGame.isPlaying) {
      returnMessage += "游戏已经开始了";
      return returnMessage;
    }

    const linkGameData = await LinkGameData.getorCreate(ctx, cid);

    const xLength = linkGameData.xLength;
    const yLength = linkGameData.yLength;
    const patternCounts = linkGameData.patternCounts;
    if (patternCounts > config.pattermType.length) {
      returnMessage += "现在图案种类比库存多...请更改设置";
      return returnMessage;
    }

    if (linkGameData.timeLimitOn) {
      linkGameTimeStart(session, linkGame);
    }
    const img = await linkGameDraw.game(config, linkGame);
    returnMessage +=
      `游戏开始咯~\n` +
      `大小${linkGame.table.xLength}x${linkGame.table.yLength} 图案数${linkGame.patterns.length}\n` +
      `连接图案请使用\n` +
      `"连连看.连"\n` +
      `需要重排请使用\n` +
      `"连连看.重排"`;
    returnMessage += addMsgBreak();
    returnMessage += img;
    return returnMessage;
  });

  async function linkGameTimeStart(session: Session, linkGame: LinkGame) {
    linkGame.startTime = Date.now();
    linkGame.timeLimit =
      (linkGame.table.xLength *
        linkGame.table.yLength *
        config.timeLimitEachPair) /
      2;
    linkGame.timeLimitTimer = ctx.setTimeout(
      async () => linkGameTimeOut(session),
      linkGame.timeLimit
    );
  }

  async function linkGameTimeOut(session: Session) {
    const cid = session.cid;
    const linkGame = linkGameTemp[cid];
    const message = await linkGameOver(session, linkGame, "时间结束了呀...");
    try {
      session.send(message);
    } catch (e) {
      try {
        linkGame.lastSession.send(message);
      } catch (e) {
        try {
          session.bot.sendMessage(session.channelId, message);
        } catch (e) {}
      }
    }
  }

  ctx.command("连连看.结束").action(async ({ session }) => {
    const cid = session.cid;
    const linkGame = linkGameTemp.getorCreate(cid);
    if (!linkGame.isPlaying) return addAt(session) + "游戏还没开始呢";
    return await linkGameOver(session, linkGame, "游戏自我了断了...");
  });

  // 游戏结束
  async function linkGameOver(
    session: Session,
    linkGame: LinkGame,
    text: string
  ) {
    const cid = session.cid;
    linkGame.clear();
    let returnMessage = addAt(session) + text;
    returnMessage += addMsgBreak();
    const img = await linkGameDraw.over(config);
    returnMessage += img;
    if (linkGame?.score) {
      returnMessage += addMsgBreak();

      const linkGameData = await LinkGameData.getorCreate(ctx, cid);

      if (linkGameData[0].maxScore < linkGame.score) {
        linkGameData.maxScore = linkGame.score;
        await LinkGameData.update(ctx, linkGameData);
        returnMessage += `本局得分：${linkGame.score}\n`;
        returnMessage += `新纪录~`;
      } else returnMessage += `本局得分：${linkGame.score}`;
    }
    return returnMessage;
  }

  ctx.command("连连看.重排").action(async ({ session }) => {
    let returnMessage = addAt(session);
    const cid = session.cid;
    const linkGame = linkGameTemp.getorCreate(cid);
    linkGame.lastSession = session;
    linkGame.combo = 0;
    const { isPlaying, table } = linkGame;

    if (!isPlaying) {
      returnMessage += "游戏还没开始呢";
      return returnMessage;
    }
    table.shuffle();
    const timeLeft = linkGame.timeLeft;
    const timeLimit = linkGame.timeLimit;
    const img = await linkGameDraw.game(config, linkGame);
    returnMessage += "已经重新打乱顺序了~";
    returnMessage += addMsgBreak();
    returnMessage += img;
    return returnMessage;
  });

  ctx
    .command("连连看.连")
    .alias("连")
    .action(async ({ session, args }) => {
      let returnMessage = addAt(session);
      const cid = session.cid;
      const { isPlaying, table } = linkGameTemp.getorCreate(cid);
      if (!isPlaying) return;

      if (args.length % 2 !== 0) {
        returnMessage += "参数数量有问题呀";
        returnMessage += addMsgBreak();
        args.pop();
      }

      // 这部分用于把传入的数对拆分
      const pointArr = [...args];
      const pointPairArr: [LinkPoint, LinkPoint][] = [];
      while (pointArr.length > 1) {
        const p1: LinkPoint = LinkTable.order2Point(
          Math.floor(+pointArr.shift()),
          table
        );
        const p2: LinkPoint = LinkTable.order2Point(
          Math.floor(+pointArr.shift()),
          table
        );
        pointPairArr.push([p1, p2]);
      }
      returnMessage += await checkLickGame(session, pointPairArr);

      return returnMessage;
    });

  async function checkLickGame(
    session: Session,
    pointPairArr: [LinkPoint, LinkPoint][]
  ) {
    let returnMessage = addAt(session);
    const cid = session.cid;
    const linkGame = linkGameTemp.getorCreate(cid);
    linkGame.lastSession = session;
    const { table } = linkGame;

    let addScore = 0;

    const pathInfoArr = table.checkPointArr(config, pointPairArr);
    let truePathInfoArr = pathInfoArr.filter(
      (info: LinkPathInfo) => info.enableLink
    );
    let wrongPathInfoArr = pathInfoArr.filter(
      (info: LinkPathInfo) => !info.enableLink
    );

    if (truePathInfoArr.length === 0) {
      linkGame.combo = 0;
      returnMessage += addMsgBreak();
      if (pointPairArr.length === 1) returnMessage += pathInfoArr[0].text;
      else returnMessage += "没有可以连接的图案哦~";
      return returnMessage;
    }

    if (linkGame.timeLimit) {
      if (!linkGame?.combo) {
        linkGame.combo = 0;
      }
      if (!linkGame?.score) linkGame.score = 0;
    }

    let trueTimes = 0;

    while (truePathInfoArr.length > 0) {
      trueTimes += truePathInfoArr.length;
      const removeArr: [LinkPoint, LinkPoint][] = truePathInfoArr.map(
        (info: LinkPathInfo) => [info.p1, info.p2]
      );
      const linkPathArr = truePathInfoArr.map(
        (info: LinkPathInfo) => info.linkPath
      );
      const img = await linkGameDraw.game(config, linkGame, linkPathArr);
      returnMessage += img;
      returnMessage += addMsgBreak();
      for (const [p1, p2] of removeArr) {
        table.remove(p1, p2);
      }
      const pathInfoArr = table.checkPointArr(
        config,
        wrongPathInfoArr.map((info: LinkPathInfo) => [info.p1, info.p2])
      );
      truePathInfoArr = pathInfoArr.filter(
        (info: LinkPathInfo) => info.enableLink
      );
      wrongPathInfoArr = pathInfoArr.filter(
        (info: LinkPathInfo) => !info.enableLink
      );
    }

    if (trueTimes * config.comboTime < Date.now() - linkGame.lastLinkTime) {
      linkGame.combo = 0;
    }

    if (!wrongPathInfoArr.length && linkGame.timeLimit) {
      for (let i = 0; i < trueTimes; i++) {
        addScore += 10 * 2 ** linkGame.combo;
        linkGame.combo++;
      }
    }

    if (table.isClear) {
      returnMessage += await linkGameWIn(session);
    } else {
      const resultImg = await linkGameDraw.game(config, linkGame);
      returnMessage += resultImg;
      returnMessage += addMsgBreak();
      if (linkGame.combo > 1) {
        returnMessage += `${linkGame.combo}连击！\n`;
      }
      if (wrongPathInfoArr.length > 0) {
        if (linkGame.timeLimit) {
          addScore += 10 * trueTimes;
          linkGame.combo = 0;
        }
        const returnStr = wrongPathInfoArr
          .map(
            (info: LinkPathInfo) =>
              "" +
              LinkTable.point2Order(info.p1, table) +
              "与" +
              LinkTable.point2Order(info.p2, table) +
              info.text
          )
          .join("\n");
        returnMessage += returnStr;
      }
      if (linkGame.timeLimit) {
        returnMessage += `得分 ${addScore}\n`;
        returnMessage += `当前得分 ${(linkGame.score += addScore)}\n`;
      }
    }
    linkGame.lastLinkTime = Date.now();
    return returnMessage;
  }

  async function linkGameWIn(session: Session) {
    let returnMessage: string = "";

    const img = await linkGameDraw.win(config);
    returnMessage += img;

    returnMessage += addMsgBreak();
    returnMessage += "所有的图案都被消除啦~\n";

    const cid = session.cid;
    const linkGame = linkGameTemp[cid];
    if (linkGame?.score) {
      const linkGameData = await LinkGameData.getorCreate(ctx, cid);
      if (linkGameData[0].maxScore < linkGame.score) {
        linkGameData.maxScore = linkGame.score;
        await LinkGameData.update(ctx, linkGameData);
        returnMessage += `本局得分：${linkGame.score}\n`;
        returnMessage += `是新纪录~`;
      } else returnMessage += `本局得分：${linkGame.score}`;
    }

    linkGame.isPlaying = false;
    linkGame.clear();

    return returnMessage;
  }
}
