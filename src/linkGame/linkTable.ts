import { Random } from "koishi";
import { config } from "../koishi/config";
export { LinkPoint, LinkTable, LinkPathInfo };

const IS_EMPTY = 0;
const IS_VISITED = 1;
const IS_OTHER_PATTERN = 2;
const IS_TARGET = 3;
type LinkPointJudgement = 0 | 1 | 2 | 3;

class LinkPoint {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  static equal(p1: LinkPoint, p2: LinkPoint): boolean {
    return p1.x === p2.x && p1.y === p2.y;
  }
}

type linkFailReason =
  | "NaNPositon"
  | "Coincide"
  | "OutRange"
  | "Void"
  | "UnPair"
  | "NoWay";

// 作为table.checkPath与table.checkPointPair的返回值
class LinkPathInfo {
  p1: LinkPoint;
  p2: LinkPoint;
  enableLink: boolean;
  linkPath: LinkPoint[];
  reason?: linkFailReason;
  get text() {
    switch (this?.reason) {
      case "NaNPositon":
        return "位置不是数字";
      case "Coincide":
        return "位置重复";
      case "OutRange":
        return "位置超出范围";
      case "Void":
        return "选择了一个没有图案的位置...";
      case "UnPair":
        return "两个位置的图案不一样...";
      case "NoWay":
        return "这两个位置无法连接...";
      default:
        return "?";
    }
  }

  constructor(
    p1: LinkPoint,
    p2: LinkPoint,
    enableLink: boolean,
    linkPath: LinkPoint[],
    reason?: linkFailReason
  ) {
    this.p1 = p1;
    this.p2 = p2;
    this.enableLink = enableLink;
    this.linkPath = linkPath;
    this.reason = reason;
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
  pointUsed: LinkPoint[] = [];
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

  constructor(
    xLength: number,
    yLength: number,
    patternCounts: number
  ) {
    if ((xLength * yLength) % 2 !== 0) throw new Error("总格数必须为偶数");
    this.xLength = xLength;
    this.yLength = yLength;
    this.pointUsed = [];
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

  removePointPairArr(pointPairArr: [LinkPoint, LinkPoint][]): void {
    for (let i = 0; i < pointPairArr.length; i++) {
      this.remove(pointPairArr[i][0], pointPairArr[i][1]);
    }
  }

  // 检查是否存在三条直线可以连接的通路
  /**
   *
   */
  checkPath(p1: LinkPoint, p2: LinkPoint): LinkPathInfo {
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

    let info = new LinkPathInfo(p1, p2, false, null, "NoWay");

    // 搜索函数，如果是空则加入节点，如果是图案则确定是否是目标图案
    function checkTarget(
      x: number,
      y: number,
      currentNode: Node
    ): LinkPointJudgement {
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
      info = new LinkPathInfo(p1, p2, true, linkPath);
      this.pointUsed.push(p1);
      this.pointUsed.push(p2);
      return IS_TARGET;
    }

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
    return info;
  }

  checkPointPair(p1: LinkPoint, p2: LinkPoint): LinkPathInfo {
    if (isNaN(p1.x) || isNaN(p1.y) || isNaN(p2.x) || isNaN(p2.y))
      return new LinkPathInfo(p1, p2, false, null, "NaNPositon");
    if (
      this.pointUsed.some(
        (point) => LinkPoint.equal(point, p1) || LinkPoint.equal(point, p2)
      ) ||
      LinkPoint.equal(p1, p2)
    )
      return new LinkPathInfo(p1, p2, false, null, "Coincide");
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
      return new LinkPathInfo(p1, p2, false, null, "OutRange");
    if (this.pattern[p1.x][p1.y] === 0 || this.pattern[p2.x][p2.y] === 0)
      return new LinkPathInfo(p1, p2, false, null, "Void");
    if (this.pattern[p1.x][p1.y] !== this.pattern[p2.x][p2.y])
      return new LinkPathInfo(p1, p2, false, null, "UnPair");
    return this.checkPath(p1, p2);
  }

  // 将传入的位置对数组转化为根据成功和连击切分的数组
  async linkCheck(
    pointPairArr: [LinkPoint, LinkPoint][]
  ): Promise<LinkPathInfo[][]> {
    const infoArrArr: LinkPathInfo[][] = [];
    let infoArr: LinkPathInfo[] = [];
    for (const [p1, p2] of pointPairArr) {
      const info = this.checkPointPair(p1, p2);
      if (info.enableLink) {
        infoArr.push(info);
      } else {
        infoArrArr.push(infoArr);
        if (info.reason === "NoWay") {
          this.removePointPairArr(infoArr.map((info) => [info.p1, info.p2]));
          const reCheckinfo = this.checkPointPair(p1, p2);
          if (reCheckinfo.enableLink) {
            infoArr = [reCheckinfo];
            continue;
          }
        }
        infoArrArr.push([info]);
        infoArr = [];
      }
    }
    infoArrArr.push(infoArr);
    return infoArrArr;
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
