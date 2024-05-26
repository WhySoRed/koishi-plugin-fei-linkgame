import { Context, Random, Session, h } from "koishi";
import { Config } from "./config";

import { LinkTable, LinkPoint, LinkPathInfo } from "./linkGameMethods";
import { LinkGameDraw } from "./draw";

import {} from "koishi-plugin-puppeteer";
export class LinkGame {
  isPlaying: boolean = false;
  patterns: string[];
  patternColors: string[];
  table: LinkTable;
  lastLinkTime: number;
  combo: number;
  startTime: number;
  timeLimit: number;
  timeLimitTimer: () => void;
  score: number;
  lastSession: Session;
  clear() {
    this.timeLimitTimer && this.timeLimitTimer();
    this.lastLinkTime = null;
    this.isPlaying = false;
    this.score = 0;
    this.combo = 0;
    this.timeLimit = null;
  }
}

export const linkGameTemp = {
  clear(cid: string) {
    const linkGame = linkGameTemp[cid];
    if (!linkGame) return;
    linkGame.clear();
    delete linkGameTemp[cid];
  },

  clearAll() {
    for (const key in this) {
      if (key === "clear" || key === "clearAll") continue;
      this.clear(key);
    }
  },
};

export async function command(ctx: Context, config: Config) {
  const linkGameDraw = new LinkGameDraw(ctx);

  ctx.command("连连看").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const img = await linkGameDraw.welcome(session, config);
    const maxScore = (
      await ctx.database.get("linkGameData", {
        cid: session.cid,
      })
    )[0].maxScore;
    let returnMessage =
      img +
      at +
      `一起来玩...\n` +
      `KOISHI连连看~\n` +
      `指令一览：\n\n` +
      `连连看.开始\n` +
      `连连看.结束\n` +
      `连连看.重排\n` +
      `连连看.设置\n` +
      `连连看.连`;

    if (maxScore) {
      returnMessage += `\n\n` + `本群目前最高分：${maxScore}~`;
    }
    return returnMessage;
  });

  ctx.command("连连看.设置").action(async ({ session, args }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    let linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", { cid });
      linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    }
    const xLength = linkGameData.xLength;
    const yLength = linkGameData.yLength;
    const maxPatternTypes = linkGameData.maxPatternTypes;
    // TODO: 把这个用图片输出
    return (
      at +
      `当前设置：\n` +
      `每列图案个数：${xLength}\n` +
      `每行图案个数：${yLength}\n` +
      `当前图案库存数：${config.pattermType.length}\n` +
      `是否开启限时模式：${linkGameData.timeLimitOn ? "是" : "否"}\n` +
      `当前每局图案最大数量：${maxPatternTypes}\n\n` +
      `查看设置指令请发送\n` +
      `help 连连看.设置`
    );
  });

  ctx.command("连连看.设置.尺寸").action(async ({ session, args }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (linkGame.isPlaying) return at + " 游戏中不可以更改设置哦";
    let linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", { cid });
    }
    if (args.length !== 2) return at + "参数数量错误";
    const xLength = Math.floor(+args[0]);
    const yLength = Math.floor(+args[1]);
    if (isNaN(xLength) || isNaN(yLength)) return at + "参数错误";
    if (xLength < 2 || yLength < 2) return at + "参数错误";
    if ((xLength * yLength) % 2 !== 0) return at + "格子总数要是偶数个才行..";
    await ctx.database.set(
      "linkGameData",
      { cid: session.cid },
      { xLength, yLength }
    );
    return at + "设置更改成功~";
  });
  ctx.command("连连看.设置.图案数").action(async ({ session, args }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (linkGame.isPlaying) return at + " 游戏中不可以更改设置哦";
    let linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", { cid });
    }
    if (args.length !== 1) return at + "参数数量错误";
    const maxPatternTypes = Math.floor(+args[0]);
    if (isNaN(maxPatternTypes)) return at + "参数错误";
    if (maxPatternTypes > config.pattermType.length)
      return at + "我准备的图案没有那么多呀...";
    if (maxPatternTypes < 1) return at + "额...起码得有一种图案吧...";
    await ctx.database.set(
      "linkGameData",
      { cid: session.cid },
      { maxPatternTypes }
    );
    return at + "设置更改成功~";
  });

  ctx.command("连连看.设置.限时").action(async ({ session, args }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (linkGame.isPlaying) return at + " 游戏中不可以更改设置哦";
    let linkGameData = (await ctx.database.get("linkGameData", { cid }))[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", { cid });
    }
    linkGameData.timeLimitOn = !linkGameData.timeLimitOn;
    await ctx.database.set(
      "linkGameData",
      { cid: session.cid },
      { timeLimitOn: linkGameData.timeLimitOn }
    );
    if (linkGameData.timeLimitOn) {
      return at + "禅模式关闭~\n限时但是会计算分数哦";
    } else {
      linkGame.startTime = null;
      linkGame.timeLimit = null;
      return at + "禅模式关闭~\n不限时但是不会计算分数哦";
    }
  });
  ctx.command("连连看.设置.重置").action(async ({ session, args }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    if (linkGame.isPlaying) return at + " 游戏中不可以更改设置哦";
    await ctx.database.set("linkGameData", { cid }, { maxScore: 0 });
    return at + "重置成功~";
  });

  ctx.command("连连看.开始").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    let returnMessage = at;

    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());

    if (linkGame.isPlaying) {
      returnMessage += "游戏已经开始了";
      return returnMessage;
    }

    let linkGameData = (
      await ctx.database.get("linkGameData", { cid: session.cid })
    )[0];
    if (!linkGameData) {
      await ctx.database.create("linkGameData", { cid: session.cid });
      linkGameData = (
        await ctx.database.get("linkGameData", { cid: session.cid })
      )[0];
    }

    const xLength = linkGameData.xLength;
    const yLength = linkGameData.yLength;
    const maxPatternTypes = linkGameData.maxPatternTypes;
    if (maxPatternTypes > config.pattermType.length) {
      returnMessage += "现在图案种类比库存多...请更改设置";
      return returnMessage;
    }

    linkGame.isPlaying = true;
    const random = new Random();
    linkGame.patterns = random
      .shuffle(config.pattermType)
      .slice(0, maxPatternTypes);
    linkGame.patternColors = [];
    for (let i = 0; i < maxPatternTypes; i++) {
      linkGame.patternColors.push(config.lineColor);
    }
    linkGame.table = new LinkTable(xLength, yLength, maxPatternTypes);

    if (linkGameData.timeLimitOn) {
      linkGameTimeStart(session, linkGame);
    }
    const timeLeft = linkGame.timeLimit - (Date.now() - linkGame.startTime);
    const timeLimit = linkGame.timeLimit;
    const img = await linkGameDraw.game(
      session,
      config,
      linkGame.patterns,
      linkGame.patternColors,
      linkGame.table,
      null,
      timeLeft,
      timeLimit
    );
    returnMessage +=
      `游戏开始咯~\n` +
      `大小${linkGame.table.xLength}x${linkGame.table.yLength} 图案数${linkGame.patterns.length}\n` +
      `连接图案请使用\n` +
      `"连连看.连"\n` +
      `需要重排请使用\n` +
      `"连连看.重排"`;
    if (config.addSpace) returnMessage += "<message/>";
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
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!linkGame.isPlaying) return at + "游戏还没开始呢";
    return await linkGameOver(session, linkGame, "游戏自我了断了...");
  });

  // 游戏结束
  async function linkGameOver(
    session: Session,
    linkGame: LinkGame,
    text: string
  ) {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    linkGame.clear();
    let returnMessage = at + text;
    if (config.addSpace) returnMessage += "<message/>";
    const img = await linkGameDraw.over(session, config);
    returnMessage += img;
    if (linkGame?.score) {
      if (config.addSpace) returnMessage += "<message/>";
      const linkGameData = await ctx.database.get("linkGameData", {
        cid: session.cid,
      });
      if (linkGameData[0].maxScore < linkGame.score) {
        await ctx.database.upsert("linkGameData", linkGameData);
        returnMessage += `本局得分：${linkGame.score}\n`;
        returnMessage += `新纪录~`;
      } else returnMessage += `本局得分：${linkGame.score}`;
    }
    return returnMessage;
  }

  ctx.command("连连看.重排").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    let returnMessage = at;
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    linkGame.lastSession = session;
    linkGame.combo = 0;
    const { isPlaying, table, patterns, patternColors } = linkGame;

    if (!isPlaying) {
      returnMessage += "游戏还没开始呢";
      return returnMessage;
    }
    table.shuffle();
    const timeLeft = linkGame.timeLimit - (Date.now() - linkGame.startTime);
    const timeLimit = linkGame.timeLimit;
    const img = await linkGameDraw.game(
      session,
      config,
      patterns,
      patternColors,
      table,
      null,
      timeLeft,
      timeLimit
    );
    returnMessage += "已经重新打乱顺序了~";
    if (config.addSpace) returnMessage += "<message/>";
    returnMessage += img;
    return returnMessage;
  });

  ctx
    .command("连连看.连")
    .alias("连")
    .action(async ({ session, args }) => {
      const at =
        config.atUser && !session.event.channel.type
          ? h.at(session.userId) + " "
          : "";
      let returnMessage = at;
      const cid = session.cid;
      const { isPlaying, table } =
        linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
      if (!isPlaying) return;

      if (args.length % 2 !== 0) {
        returnMessage += "参数数量有问题呀";
        if (config.addSpace) returnMessage += "<message/>";
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
    let returnMessage =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";

    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    linkGame.lastSession = session;
    const { table, patterns, patternColors } = linkGame;

    let addScore = 0;

    const timeLeft = linkGame.timeLimit - (Date.now() - linkGame.startTime);
    const timeLimit = linkGame.timeLimit;

    const pathInfoArr = table.checkPointArr(config, pointPairArr);
    let truePathInfoArr = pathInfoArr.filter(
      (info: LinkPathInfo) => info.enableLink
    );
    let wrongPathInfoArr = pathInfoArr.filter(
      (info: LinkPathInfo) => !info.enableLink
    );

    if (truePathInfoArr.length === 0) {
      linkGame.combo = 0;
      if (config.addSpace) returnMessage += "<message/>";
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
      const img = await linkGameDraw.game(
        session,
        config,
        patterns,
        patternColors,
        table,
        linkPathArr,
        timeLeft,
        timeLimit
      );
      returnMessage += img;
      if (config.addSpace) returnMessage += "<message/>";
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
      const resultImg = await linkGameDraw.game(
        session,
        config,
        patterns,
        patternColors,
        table,
        null,
        timeLeft,
        timeLimit
      );
      returnMessage += resultImg;
      if (config.addSpace) returnMessage += "<message/>";
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

    const img = await linkGameDraw.win(session, config);
    returnMessage += img;

    if (config.addSpace) returnMessage += "<message/>";
    returnMessage += "所有的图案都被消除啦~\n";

    const cid = session.cid;
    const linkGame = linkGameTemp[cid];
    if (linkGame?.score) {
      const linkGameData = await ctx.database.get("linkGameData", {
        cid: session.cid,
      });
      if (linkGameData[0].maxScore < linkGame.score) {
        await ctx.database.upsert("linkGameData", linkGameData);
        returnMessage += `本局得分：${linkGame.score}\n`;
        returnMessage += `是新纪录~`;
      } else returnMessage += `本局得分：${linkGame.score}`;
    }

    linkGame.isPlaying = false;
    linkGame.clear();

    return returnMessage;
  }
}
