import { table } from "console";
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
  parent?: Node;
  level: number = 0;
  constructor(x: number, y: number, level?: number, parent?: Node) {
    super(x, y);
    this.level = level;
    this.parent = parent;
  }
}

// 当前的游戏盘
export class Table {
  xLength: number;
  yLength: number;
  patternRangeLength: number = 5;
  squares: number[][];
  
  constructor(xLength: number, yLength: number, patternRangeLength?: number) {
    this.xLength = xLength;
    this.yLength = yLength;
    if (patternRangeLength) {
      this.patternRangeLength = patternRangeLength;
    }
    this.squares = this.init();
  }

  // 初始化
  init(): number[][] {
    const squares: number[][] = [];
    for (let x = 0; x < this.xLength; x++) {
      squares[x] = [];
      for (let y = 0; y < this.yLength; y++) {
        squares[x][y] = Math.floor(Math.random() * (this.patternRangeLength)) + 1;
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
  checkPath(p1: Point, p2: Point):Path {

    if (p1.x === p2.x && p1.y === p2.y) {
      return new Path(false, null, "位置重复");
    }
    if (
      p1.x < 0 || p1.x > this.xLength ||
      p2.x < 0 || p2.x > this.xLength ||
      p1.y < 0 || p1.y > this.yLength ||
      p2.y < 0 || p2.y > this.yLength
    ) {
      return new Path(false, null, "位置超出范围");
    }

    const checkTable: number[][] = [];
    const startX: number = p1.x + 1;
    const startY: number = p1.y + 1;
    const endX: number = p2.x + 1;
    const endY: number = p2.y + 1;

    // 建立一个扩大一圈的检查路径的表格
    for (let x = 0; x < this.xLength + 2; x++) {
      checkTable[x] = [];
      for (let y = 0; y < this.yLength + 2; y++) {
        if (
          x === 0 ||
          x === this.xLength + 1 ||
          y === 0 ||
          y === this.yLength + 1
        ) {
          checkTable[x][y] = 0;
        } else checkTable[x][y] = this.squares[x - 1][y - 1];
      }
    }

    const visited: boolean[][] = []; // 记录是否访问过
    const nodeQueue: Node[] = []; // 建立一个队列
    let nodeQueueIndex = 0; // 队列的下标

    nodeQueue.push(new Node(startX, startY)); // 将起点加入队列

    while (nodeQueue.length) {
      const currentNode = nodeQueue[nodeQueueIndex++];
      if(currentNode.level > 2) break;   // 超过三层则停止
      if(currentNode.x === endX && currentNode.y === endY) {
        const points: Point[] = [];
        let node: Node = currentNode;
        while(node.parent) {
          points.push(new Point(node.x, node.y));
          node = node.parent;
        }
        points.push(new Point(node.x, node.y));
        return new Path(true, points.reverse(), "找到通路");
      }

      // 向四个方向延伸
      const x = currentNode.x;
      const y = currentNode.y;
      for (let i = x; i < this.xLength + 2; i++) {
        if (!visited[i][y]) {
          nodeQueue.push(new Node(i, y, currentNode.level + 1, currentNode));
        }
        visited[i][y] = true;
      }
      for (let i = x; i >= 0; i--) {
        if (!visited[i][y]) {
          nodeQueue.push(new Node(i, y, currentNode.level + 1, currentNode));
        }
        visited[i][y] = true;
      }
      for (let i = y; i < this.yLength + 2; i++) {
        if (!visited[x][i]) {
          nodeQueue.push(new Node(x, i, currentNode.level + 1, currentNode));
        }
        visited[x][i] = true;
      }
      for (let i = y; i >= 0; i--) {
        if (!visited[x][i]) {
          nodeQueue.push(new Node(x, i, currentNode.level + 1, currentNode));
        }
        visited[x][i] = true;
      }
    }
    return new Path(false, null, "没有通路");
  }

}