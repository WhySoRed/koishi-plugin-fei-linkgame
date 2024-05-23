import { BlobOptions } from "buffer";
import { Random } from "koishi";

export class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// 作为table.checkPath的返回值
export class Path {
  enableLink: boolean;
  points?: Point[];
  text?: string;
  constructor(enableLink: boolean, points?: Point[], text?: string) {
    this.enableLink = enableLink;
    this.points = points;
    this.text = text;
  }
}

class Node extends Point {
  level: number = 0;
  parent?: Node;
  constructor(x: number, y: number, level?: number, parent?: Node) {
    super(x, y);
    if (level) this.level = level;
    if (parent) this.parent = parent;
  }
}

// 当前的游戏盘
export class Table {
  xLength: number;
  yLength: number;
  patternRangeLength: number = 7;
  squares: number[][];

  constructor(xLength: number, yLength: number, patternRangeLength?: number) {
    if ((xLength * yLength) % 2 !== 0) throw new Error("总格数必须为偶数");
    this.xLength = xLength;
    this.yLength = yLength;
    if (patternRangeLength) {
      this.patternRangeLength = patternRangeLength;
    }
    this.squares = this.init();
  }

  // 初始化
  init(): number[][] {
    const random = new Random();

    function randomArr(length: number) {
      for (let i = 0; i < length; i++) {
        patternList.push(i + 1);
      }
      return random.shuffle(patternList);
    }

    let patternList: number[] = [];
    let patternCreateArr = randomArr(this.patternRangeLength);

    for (let i = 0; i < (this.xLength * this.yLength) / 2; i++) {
      if (patternCreateArr.length === 0) {
        patternCreateArr = randomArr(this.patternRangeLength);
      }
      const pattern = randomArr(this.patternRangeLength).pop();
      patternList.push(pattern);
    }

    patternList = patternList.concat(patternList);
    patternList = random.shuffle(patternList);

    const squares: number[][] = [];
    for (let x = 0; x < this.xLength; x++) {
      squares[x] = [];
      for (let y = 0; y < this.yLength; y++) {
        squares[x][y] = patternList.pop();
      }
    }
    return squares;
  }

  // 打乱
  shuffle() {
    const pointList: Point[] = [];
    let patternList: number[] = [];
    for (let x = 0; x < this.xLength; x++) {
      for (let y = 0; y < this.yLength; y++) {
        if (this.squares[x][y]) {
          pointList.push(new Point(x, y));
          patternList.push(this.squares[x][y]);
        }
      }
    }
    const random = new Random();
    patternList = random.shuffle(patternList);
    for (let i = 0; i < pointList.length; i++) {
      this.squares[pointList[i].x][pointList[i].y] = patternList[i];
    }
  }

  // 检查是否存在三条直线可以连接的通路
  checkPath(p1: Point, p2: Point): Path {

    if (p1.x === p2.x && p1.y === p2.y) {
      return new Path(false, null, "位置重复");
    }
    if (
      p1.x < 0 ||
      p1.x > this.xLength ||
      p2.x < 0 ||
      p2.x > this.xLength ||
      p1.y < 0 ||
      p1.y > this.yLength ||
      p2.y < 0 ||
      p2.y > this.yLength
    ) {
      return new Path(false, null, "位置超出范围");
    }

    const tempCheckTable: number[][] = [];
    const startX: number = p1.x + 1;
    const startY: number = p1.y + 1;
    const endX: number = p2.x + 1;
    const endY: number = p2.y + 1;

    // 建立一个扩大一圈的检查路径的表格
    for (let x = 0; x < this.xLength + 2; x++) {
      tempCheckTable[x] = [];
      for (let y = 0; y < this.yLength + 2; y++) {
        if (
          x === 0 ||
          x === this.xLength + 1 ||
          y === 0 ||
          y === this.yLength + 1
        ) {
          tempCheckTable[x][y] = 0;
        } else tempCheckTable[x][y] = this.squares[x - 1][y - 1];
      }
    }

    // 最大折线数
    const maxLevel =
      (p1.x === 0 && p2.y === 0) ||
      (p1.x === 0 && p2.y === this.yLength - 1) ||
      (p1.x === this.xLength - 1 && p2.y === 0) ||
      (p1.x === this.xLength - 1 && p2.y === this.yLength - 1) ||
      (p2.x === 0 && p1.y === 0) ||
      (p2.x === 0 && p1.y === this.yLength - 1) ||
      (p2.x === this.xLength - 1 && p1.y === 0) ||
      (p2.x === this.xLength - 1 && p1.y === this.yLength - 1)
        ? 3 //如果有一点在边缘则允许更大范围的搜索
        : 2; //否则超过三次折线则停止

    const visited: boolean[][] = []; // 记录是否访问过
    for (let x = 0; x < this.xLength + 2; x++) {
      visited[x] = [];
      for (let y = 0; y < this.yLength + 2; y++) {
        visited[x][y] = false;
      }
    }
    const nodeQueue: Node[] = []; // 建立一个队列

    nodeQueue.push(new Node(startX, startY)); // 将起点加入队列

    let linkPath = new Path(false, null, "没有通路");

    // 搜索函数，如果是空则加入节点，如果是图案则确定是否是目标图案
    const checkTarget = (x: number, y: number, currentNode: Node): boolean => {
      if (x === endX && y === endY) {
        const points: Point[] = [];
        let node: Node = currentNode;
        while (node.parent) {
          points.push(new Point(node.x, node.y));
          node = node.parent;
        }
        points.push(new Point(node.x, node.y));
        points.reverse().push(new Point(endX,endY))
        linkPath = new Path(true, points, "找到通路");
        return true;
      }
      return false;
    };

    // 以队列循环搜索
    end: while (nodeQueue.length) {
      const currentNode = nodeQueue.shift();
      if (currentNode.level > maxLevel) break;
      console.log("nq:" + JSON.stringify(currentNode));
      // 向四个方向延伸
      const x = currentNode.x;
      const y = currentNode.y;
      for (let i = x + 1; i < this.xLength + 2; i++) {
        if (!visited[i][y]) {
          if (tempCheckTable[i][y] !== 0) {
            if (checkTarget(i, y, currentNode)) break end;
            else break;
          } else
            nodeQueue.push(new Node(i, y, currentNode.level + 1, currentNode));
          visited[i][y] = true;
        }
      }
      for (let i = x - 1; i >= 0; i--) {
        if (!visited[i][y]) {
          if (tempCheckTable[i][y] !== 0) {
            if (checkTarget(i, y, currentNode)) break end;
            else break;
          } else
            nodeQueue.push(new Node(i, y, currentNode.level + 1, currentNode));
          visited[i][y] = true;
        }
      }
      for (let i = y + 1; i < this.yLength + 2; i++) {
        if (!visited[x][i]) {
          if (tempCheckTable[x][i] !== 0) {
            if (checkTarget(x, i, currentNode)) break end;
            else break;
          } else
            nodeQueue.push(new Node(x, i, currentNode.level + 1, currentNode));
          visited[x][i] = true;
        }
      }
      for (let i = y - 1; i >= 0; i--) {
        if (!visited[x][i]) {
          if (tempCheckTable[x][i] !== 0) {
            if (checkTarget(x, i, currentNode)) break end;
            else break;
          } else
            nodeQueue.push(new Node(x, i, currentNode.level + 1, currentNode));
          visited[x][i] = true;
        }
      }
    }
    return linkPath;
  }
}
