import { Context, Random, Session, h } from "koishi";
import { Config } from "./config";

import { LinkTable, LinkPoint, PathInfo } from "./linkGameMethods";
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
  clear() {
    this.timeLimitTimer && this.timeLimitTimer();
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
    await session.send(returnMessage);
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
      `当前每局图案最大数量：${maxPatternTypes}\n\n`
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
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());

    if (linkGame.isPlaying) return at + `游戏已经开始了`;

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
    if (maxPatternTypes > config.pattermType.length)
      return at + "现在图案种类比库存多...请更改设置";

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

    session.send(
      at +
        `游戏开始咯~\n` +
        `大小${linkGame.table.xLength}x${linkGame.table.yLength} 图案数${linkGame.patterns.length}\n` +
        `连接图案请使用\n` +
        `"连连看.连"\n` +
        `需要重排请使用\n` +
        `"连连看.重排"\n`
    );
    session.send(img);
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
    if (!linkGame) return;
    linkGame.isPlaying = false;
    const img = await linkGameDraw.over(session, config);
    session.send("时间结束了呀...");
    session.send(img);
  }

  ctx.command("连连看.结束").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const linkGame =
      linkGameTemp[session.cid] || (linkGameTemp[session.cid] = new LinkGame());
    if (!linkGame.isPlaying) return at + "游戏还没开始呢";
    linkGame.isPlaying = false;
    linkGame.clear();
    session.send(at + "游戏自我了断了...");
    const img = await linkGameDraw.over(session, config);
    session.send(img);
  });

  ctx.command("连连看.重排").action(async ({ session }) => {
    const at =
      config.atUser && !session.event.channel.type
        ? h.at(session.userId) + " "
        : "";
    const cid = session.cid;
    const linkGame = linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
    const { isPlaying, table, patterns, patternColors } = linkGame;

    if (!isPlaying) return at + "游戏还没开始呢";
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
    session.send(at + "已经重新打乱顺序了~");
    session.send(img);
  });

  ctx
    .command("连连看.连")
    .alias("连")
    .action(async ({ session, args }) => {
      const at =
        config.atUser && !session.event.channel.type
          ? h.at(session.userId) + " "
          : "";
      const cid = session.cid;
      const { isPlaying, table } =
        linkGameTemp[cid] || (linkGameTemp[cid] = new LinkGame());
      if (!isPlaying) return;

      if (args.length % 2 !== 0) {
        session.send(at + "参数数量有问题呀");
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
      return await checkLickGame(session, pointPairArr);
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
    const { table, patterns, patternColors } = linkGame;

    const timeLeft = linkGame.timeLimit - (Date.now() - linkGame.startTime);
    const timeLimit = linkGame.timeLimit;

    const pathInfoArr = table.checkPointArr(config, pointPairArr);
    let truePathInfoArr = pathInfoArr.filter(
      (info: PathInfo) => info.enableLink
    );
    let wrongPathInfoArr = pathInfoArr.filter(
      (info: PathInfo) => !info.enableLink
    );

    if (truePathInfoArr.length === 0) {
      if (config.addSpace) returnMessage += "<message/>";
      if (pointPairArr.length === 1) returnMessage += pathInfoArr[0].text;
      else returnMessage += "没有可以连接的图案哦~";
      return returnMessage;
    }

    while (truePathInfoArr.length > 0) {
      const removeArr: [LinkPoint, LinkPoint][] = truePathInfoArr.map(
        (info: PathInfo) => [info.p1, info.p2]
      );
      const linkPathArr = truePathInfoArr.map((info) => info.linkPath);
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
        wrongPathInfoArr.map((info: PathInfo) => [info.p1, info.p2])
      );
      truePathInfoArr = pathInfoArr.filter((info: PathInfo) => info.enableLink);
      wrongPathInfoArr = pathInfoArr.filter(
        (info: PathInfo) => !info.enableLink
      );
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

      if (wrongPathInfoArr.length > 0) {
        const returnStr = wrongPathInfoArr
          .map(
            (info: PathInfo) =>
              "" +
              LinkTable.point2Order(info.p1, table) +
              "与" +
              LinkTable.point2Order(info.p2, table) +
              info.text
          )
          .join("\n");
        returnMessage += returnStr;
      }
    }
    return returnMessage;
  }

  async function linkGameWIn(session: Session) {
    let returnMessage = "所有的图案都被消除啦~"

    if(config.addSpace) returnMessage += "<message/>";

    const cid = session.cid;
    const linkGame = linkGameTemp[cid];

    linkGame.isPlaying = false;
    linkGame.clear();

    const img = await linkGameDraw.win(session, config);
    returnMessage += img;

    return returnMessage;
  }
}
