import { Context, Random, Session } from "koishi";
import { Config } from "../koishi/config";

export { LinkGame, LinkPoint, LinkTable, LinkPathInfo, LinkGameData };

const IS_EMPTY = 0;
const IS_VISITED = 1;
const IS_OTHER_PATTERN = 2;
const IS_TARGET = 3;
type LinkPointJudgement = 0 | 1 | 2 | 3;

class LinkGame {
  cid:string;
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

  constructor(cid: string) {
    this.cid = cid;
    this.isPlaying = false;
  }

  newGame(linkGameData: LinkGameData, config: Config) {}

  clear() {
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
    this.timeLimitTimer && this.timeLimitTimer();
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

class LinkPoint {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// 作为table.checkPath的返回值
class LinkPathInfo {
  p1: LinkPoint;
  p2: LinkPoint;
  enableLink: boolean;
  linkPath?: LinkPoint[];
  text?: string;
  constructor(
    p1: LinkPoint,
    p2: LinkPoint,
    enableLink: boolean,
    linkPath?: LinkPoint[],
    text?: string
  ) {
    this.p1 = p1;
    this.p2 = p2;
    this.enableLink = enableLink;
    this.linkPath = linkPath;
    this.text = text;
  }
}
class Node extends LinkPoint {
  level: number = 0;
  parent?: Node;
  constructor(x: number, y: number, level?: number, parent?: Node) {
    super(x, y);
    if (level) this.level = level;
    if (parent) this.parent = parent;
  }
}

// 当前的游戏盘
class LinkTable {
  xLength: number;
  yLength: number;
  patternCounts: number;
  pattern: number[][];
  get isClear(): boolean {
    for (let x = 0; x < this.xLength + 1; x++) {
      for (let y = 0; y < this.yLength + 1; y++) {
        if (this.pattern[x][y] !== 0) return false;
      }
    }
    return true;
  }

  constructor(xLength: number, yLength: number, patternCounts: number) {
    if ((xLength * yLength) % 2 !== 0) throw new Error("总格数必须为偶数");
    this.xLength = xLength;
    this.yLength = yLength;
    this.patternCounts = patternCounts;
    this.pattern = this.init();
  }

  // 初始化
  init(): number[][] {
    const random = new Random();
    /**
     * 下面这部分是为了让每种图案的数量大致相同，并且全部为一对
     * *1 先生成一个长度为maxPatternTypes的随机数组patternCreateArr
     * *2 逐个放入本局游戏的图案列表patternList，让每种图案至少能出现一次
     * *3 为空则再生成
     * *4 把生成的长度为总格子数一半的patternList用concat方法翻倍，就得到了一个所有图案成对的格子图案的数组
     */
    function randomPatternArr(length: number) {
      const patternCreateArr: number[] = [];
      for (let i = 0; i < length; i++) {
        patternCreateArr.push(i + 1);
      }
      return random.shuffle(patternCreateArr);
    }

    let patternList: number[] = [];
    // 1
    let patternCreateArr = randomPatternArr(this.patternCounts);
    for (let i = 0; i < (this.xLength * this.yLength) / 2; i++) {
      if (patternCreateArr.length === 0) {
        // 3
        patternCreateArr = randomPatternArr(this.patternCounts);
      }
      const pattern = patternCreateArr.pop();
      patternList.push(pattern);
    }
    // 4
    patternList = patternList.concat(patternList);
    patternList = random.shuffle(patternList);

    const pattern: number[][] = [];
    for (let x = 0; x < this.xLength + 2; x++) {
      pattern[x] = [];
      for (let y = 0; y < this.yLength + 2; y++) {
        if (
          x === 0 ||
          x === this.xLength + 1 ||
          y === 0 ||
          y === this.yLength + 1
        )
          pattern[x][y] = 0;
        else pattern[x][y] = patternList.pop();
      }
    }
    return pattern;
  }

  // 打乱重排
  shuffle() {
    const pointList: LinkPoint[] = [];
    let patternList: number[] = [];
    // 获取当前游戏还有的所有格子和图案，存入数组，再把图案洗牌重新放回
    for (let x = 0; x < this.xLength + 2; x++) {
      for (let y = 0; y < this.yLength + 2; y++) {
        if (this.pattern[x][y]) {
          pointList.push(new LinkPoint(x, y));
          patternList.push(this.pattern[x][y]);
        }
      }
    }
    const random = new Random();
    patternList = random.shuffle(patternList);
    for (let i = 0; i < pointList.length; i++) {
      this.pattern[pointList[i].x][pointList[i].y] = patternList[i];
    }
  }

  remove(p1: LinkPoint, p2: LinkPoint): void {
    this.pattern[p1.x][p1.y] = 0;
    this.pattern[p2.x][p2.y] = 0;
  }

  // 检查是否存在三条直线可以连接的通路
  /**
   *
   */
  checkPath(config: Config, p1: LinkPoint, p2: LinkPoint): LinkPathInfo {
    // 最大折线数
    let maxLevel = config.maxLink;
    if (
      config.moreSideFree &&
      ((p1.x === 1 && p2.x === this.xLength) ||
        (p1.x === this.xLength && p2.x === 1) ||
        (p1.y === 1 && p2.y === this.yLength) ||
        (p1.y === this.yLength && p2.y === 1))
    )
      maxLevel = 4;
    if (
      (config.sideFree || config.moreSideFree) &&
      ((p1.x === 1 && p2.y === 1) ||
        (p1.x === 1 && p2.y === this.yLength) ||
        (p1.x === this.xLength && p2.y === 1) ||
        (p1.x === this.xLength && p2.y === this.yLength) ||
        (p2.x === 1 && p1.y === 1) ||
        (p2.x === 1 && p1.y === this.yLength) ||
        (p2.x === this.xLength && p1.y === 1) ||
        (p2.x === this.xLength && p1.y === this.yLength))
    )
      maxLevel = 3;

    const visited: boolean[][] = []; // 记录是否访问过
    for (let x = 0; x < this.xLength + 2; x++) {
      visited[x] = [];
      for (let y = 0; y < this.yLength + 2; y++) {
        visited[x][y] = false;
      }
    }
    const nodeQueue: Node[] = []; // 建立一个队列

    nodeQueue.push(new Node(p1.x, p1.y)); // 将起点加入队列

    let linkPathInfo = new LinkPathInfo(
      p1,
      p2,
      false,
      null,
      "这两个位置无法连接..."
    );

    // 搜索函数，如果是空则加入节点，如果是图案则确定是否是目标图案
    const checkTarget = (
      x: number,
      y: number,
      currentNode: Node
    ): LinkPointJudgement => {
      if (this.pattern[x][y] === 0) {
        if (visited[x][y]) return IS_VISITED;
        visited[x][y] = true;
        nodeQueue.push(new Node(x, y, currentNode.level + 1, currentNode));
        return IS_EMPTY;
      }

      if (x !== p2.x || y !== p2.y) return IS_OTHER_PATTERN;

      const linkPath: LinkPoint[] = [];
      let node: Node = currentNode;
      while (node.parent) {
        linkPath.push(new LinkPoint(node.x, node.y));
        node = node.parent;
      }
      linkPath.push(new LinkPoint(node.x, node.y));
      linkPath.reverse().push(new LinkPoint(p2.x, p2.y));
      linkPathInfo = new LinkPathInfo(p1, p2, true, linkPath, "找到通路");
      return IS_TARGET;
    };

    // 广度优先搜索
    end: while (nodeQueue.length) {
      const currentNode = nodeQueue.shift();
      if (currentNode.level > maxLevel) break;
      // 向四个方向延伸
      const x = currentNode.x;
      const y = currentNode.y;
      for (let i = x + 1; i < this.xLength + 2; i++) {
        const judgement = checkTarget(i, y, currentNode);
        if (judgement === IS_TARGET) break end;
        else if (judgement === IS_OTHER_PATTERN) break;
        else continue;
      }
      for (let i = x - 1; i >= 0; i--) {
        const judgement = checkTarget(i, y, currentNode);
        if (judgement === IS_TARGET) break end;
        else if (judgement === IS_OTHER_PATTERN) break;
        else continue;
      }
      for (let i = y + 1; i < this.yLength + 2; i++) {
        const judgement = checkTarget(x, i, currentNode);
        if (judgement === IS_TARGET) break end;
        else if (judgement === IS_OTHER_PATTERN) break;
        else continue;
      }
      for (let i = y - 1; i >= 0; i--) {
        const judgement = checkTarget(x, i, currentNode);
        if (judgement === IS_TARGET) break end;
        else if (judgement === IS_OTHER_PATTERN) break;
        else continue;
      }
    }
    return linkPathInfo;
  }

  checkPoint(config: Config, p1: LinkPoint, p2: LinkPoint): LinkPathInfo {
    if (isNaN(p1.x) || isNaN(p1.y) || isNaN(p2.x) || isNaN(p2.y))
      return new LinkPathInfo(p1, p2, false, null, "位置不是数字");
    if (p1.x === p2.x && p1.y === p2.y)
      return new LinkPathInfo(p1, p2, false, null, "位置重复");
    if (
      p1.x < 1 ||
      p1.x > this.xLength ||
      p2.x < 1 ||
      p2.x > this.xLength ||
      p1.y < 1 ||
      p1.y > this.yLength ||
      p2.y < 1 ||
      p2.y > this.yLength
    )
      return new LinkPathInfo(p1, p2, false, null, "位置超出范围");
    if (this.pattern[p1.x][p1.y] === 0 || this.pattern[p2.x][p2.y] === 0)
      return new LinkPathInfo(
        p1,
        p2,
        false,
        null,
        "选择了一个没有图案的位置..."
      );
    if (this.pattern[p1.x][p1.y] !== this.pattern[p2.x][p2.y])
      return new LinkPathInfo(p1, p2, false, null, "两个位置的图案不一样...");

    return this.checkPath(config, p1, p2);
  }

  checkPointArr(
    config: Config,
    pointPairArr: [LinkPoint, LinkPoint][]
  ): LinkPathInfo[] {
    const pathInfoArr: LinkPathInfo[] = [];
    // 避免耍赖在一次指令中多次选择同一个位置的图案导致bug
    const existPointArr: LinkPoint[] = [];
    for (let i = 0; i < pointPairArr.length; i++) {
      if (
        existPointArr.find(
          (point) =>
            point.x === pointPairArr[i][0].x && point.y === pointPairArr[i][0].y
        ) ||
        existPointArr.find(
          (point) =>
            point.x === pointPairArr[i][1].x && point.y === pointPairArr[i][1].y
        )
      ) {
        pathInfoArr.push(
          new LinkPathInfo(
            pointPairArr[i][0],
            pointPairArr[i][1],
            false,
            null,
            "选择了已选择的位置"
          )
        );
      } else {
        const LinkPathInfo = this.checkPoint(
          config,
          pointPairArr[i][0],
          pointPairArr[i][1]
        );
        pathInfoArr.push(LinkPathInfo);
        existPointArr.push(pointPairArr[i][0]);
        existPointArr.push(pointPairArr[i][1]);
      }
    }
    return pathInfoArr;
  }

  static order2Point(orders: number, table: LinkTable): LinkPoint {
    return new LinkPoint(
      Math.floor(orders / table.yLength) + 1,
      (orders % table.yLength) + 1
    );
  }

  static point2Order(point: LinkPoint, table: LinkTable): number {
    return (point.x - 1) * table.yLength + point.y - 1;
  }
}
