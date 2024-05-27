import { LinkGame } from "../linkGameMethod";
import { LinkPoint,LinkTable } from "../linkTable";
import { Context, Random } from "koishi";
import {} from "koishi-plugin-puppeteer";
import { Config } from "../../koishi/config";

export { draw, drawOver, drawWelcome, drawWin };

async function draw(
  ctx: Context,
  config: Config,
  linkGame: LinkGame,
  table: LinkTable,
  linkPathArr?: LinkPoint[][]
) {
  const blockSize = config.blockSize;
  const timeStartColor = config.timeStartColor;
  const timeEndColor = config.timeEndColor;

  const patterns = linkGame.patterns;
  const patternColors = linkGame.patternColors;
  const timeLeft = linkGame.timeLeft;
  const timeLimit = linkGame.timeLimit;

  const width = (table.yLength + 2 - 0.8) * blockSize;
  const height = timeLimit
    ? (table.xLength + 2) * blockSize
    : (table.xLength + 2 - 0.8) * blockSize;

  const html = `
<body>
  <div id="canvas">
    <svg xmlns="http://www.w3.org/2000/svg"></svg>
    <script>
      const blockSize = ${blockSize};
      const table = ${JSON.stringify(table)};
      const pattern = [""].concat( ${JSON.stringify(patterns)});
      const patternColor = [""].concat( ${JSON.stringify(patternColors)});
      const linkPathArr = ${JSON.stringify(linkPathArr)};
      const timeLeft = ${timeLeft};
      const timeLimit = ${timeLimit};
      const timeStartColor = "${timeStartColor}";
      const timeEndColor = "${timeEndColor}";

      const canvas = document.getElementById("canvas");
      for (let i = 0; i < table.xLength * table.yLength; i++) {
        const cell = document.createElement("div");
        cell.style["grid-row"] = Math.floor(i / table.yLength) + 2;
        cell.style["grid-column"] = i % table.yLength + 2;
        canvas.appendChild(cell);
        cell.classList.add("cell");
        if (table.pattern[Math.floor(i / table.yLength) + 1][i % table.yLength + 1] === 0) continue;
  
        const block = document.createElement("div");
        block.id = "block" + i;
        block.classList.add("block");
        block.style["color"]= patternColor[table.pattern[Math.floor(i / table.yLength) + 1][i % table.yLength + 1]];
        block.innerText = pattern[table.pattern[Math.floor(i / table.yLength) + 1][i % table.yLength + 1]];
        cell.appendChild(block);
  
        const number = document.createElement("div");
        number.classList.add("number");
        number.innerText = i;
        block.appendChild(number);
      }

      if (timeLimit) {
        const timeCell = document.createElement("div");
        timeCell.classList.add("timecell");
        canvas.appendChild(timeCell);
        const timeLimitBar = document.createElement("div");
        timeLimitBar.classList.add("timelimit");
        timeCell.appendChild(timeLimitBar);
        const timeLeftBar = document.createElement("div");
        timeLeftBar.classList.add("timeleft");
        timeLimitBar.appendChild(timeLeftBar);
       }

      const svg = document.querySelector("svg");
      let shifting = 0;
      if (linkPathArr) {
        let shifting = -0.03 * blockSize * Math.floor(linkPathArr.length / 2);
      }
      for (const linkPath of linkPathArr) {
        for (let i = 0; i < linkPath.length - 1; i++) {
          let xStart = linkPath[i].y + .1 + shifting;
          let yStart = linkPath[i].x + .1 + shifting;
          let xEnd = linkPath[i + 1].y + .1 + shifting;
          let yEnd = linkPath[i + 1].x + .1 + shifting;
          if (linkPath[i].y === 0) xStart += 0.3;
          if (linkPath[i].y === table.yLength + 1) xStart -= 0.3;
          if (linkPath[i].x === 0) yStart += 0.3;
          if (linkPath[i].x === table.xLength + 1) yStart -= 0.3;
          if (linkPath[i + 1].y === 0) xEnd += 0.3;
          if (linkPath[i + 1].y === table.yLength + 1) xEnd -= 0.3;
          if (linkPath[i + 1].x === 0) yEnd += 0.3;
          if (linkPath[i + 1].x === table.xLength + 1) yEnd -= 0.3;
  
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", xStart * blockSize);
          circle.setAttribute("cy", yStart * blockSize);
          circle.setAttribute("r", "" + 0.05 * blockSize);
          circle.setAttribute("fill", "${config.lineColor}");
          svg.appendChild(circle);
  
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", xStart * blockSize);
          line.setAttribute("y1", yStart * blockSize);
          line.setAttribute("x2", xEnd * blockSize);
          line.setAttribute("y2", yEnd * blockSize);
          line.setAttribute("stroke", "${config.lineColor}");
          line.setAttribute("stroke-width", "" + 0.1 * blockSize);
          svg.appendChild(line);
        }
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", (linkPath[linkPath.length - 1].y + .1 + shifting) * blockSize);
        circle.setAttribute("cy", (linkPath[linkPath.length - 1].x + .1 + shifting) * blockSize);
        circle.setAttribute("r", "" + 0.05 * blockSize);
        circle.setAttribute("fill", "${config.lineColor}");
        svg.appendChild(circle);
        shifting += 0.03;
      }
    </script>
  </div>

  <style>
    #canvas {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      display: grid;
      grid-template-columns: 0.6fr repeat(${table.yLength}, 1fr) 0.6fr;
      grid-template-rows: 0.6fr repeat(${table.xLength}, 1fr)  ${
    timeLimit ? "0.4fr 1fr" : "0.6fr"
  };
      background: linear-gradient(to bottom right,
          ${config.backGroundColorStart},
          ${config.backGroundColorEnd});
    }

    svg {
      position: absolute;
      z-index: 1;
      width: 100%;
      height: 100%;
    }

    .cell {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .block {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 80%;
      height: 80%;
      border-radius: 10%;
      font-size: ${0.4 * blockSize}px;
      box-shadow: ${config.blockShadowColor} ${0.05 * blockSize}px ${
    0.05 * blockSize
  }px;
      background: ${config.blockColor};
    }

    .number {
      position: absolute;
      bottom: ${0.1 * blockSize}px;
      left: ${0.12 * blockSize}px;
      color: ${config.lineColor};
      font-size: ${0.18 * blockSize}px;
    }

    .timecell {
      display: flex;
      justify-content: center;
      align-items: center;
      grid-row: ${table.xLength + 3};
      grid-column: 2/${table.yLength + 2};
    }

    .timelimit {
      background-color: #de3163;
      width: ${(table.yLength - 0.4) * blockSize}px;
      height: ${0.2 * blockSize}px;
    }

    .timeleft {
      background: linear-gradient(to left,${timeStartColor}, ${timeEndColor});
      background-clip: content-box;
      box-sizing: border-box;
      padding-right: ${(1 - timeLeft / timeLimit) * 100}%;
      width: 100%;
      height: 100%;
    }
  </style>
  </body>`;
  const img = await ctx.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}

async function drawWelcome(ctx: Context, config: Config) {
  const blockSize = config.blockSize;
  const randomPatternArr = new Random().shuffle(config.patternLibrary).slice(0, 4);
  const html: string = `
  <body>
  <div id="clip">
    <div id="canvas"></div>
  </div>

  <script>
    const blockSize = ${blockSize};
    const table = { "xLength": 6, "yLength": 8, "patternCounts": 9, "pattern": [[], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 0, 0], [0, 0, 0, 0, 2, 2/**/, 1/**/, 0, 0, 0], [0, 0, 4, 4, 2, 3/**/, 4/**/, 4, 0, 0], [0, 0, 0, 0, 3, 2/**/, 3, 1, 4, 0], [0, 0,0, 0, 0, 0, 0, 0, 0, 0], []] };
    const pattern = [""].concat(${JSON.stringify(randomPatternArr)});

    const canvas = document.getElementById("canvas");
    for (let i = 0; i < table.xLength * table.yLength; i++) {
      const cell = document.createElement("div");
      cell.style["grid-row"] = Math.floor(i / table.yLength) + 2;
      cell.style["grid-column"] = i % table.yLength + 2;
      canvas.appendChild(cell);
      cell.classList.add("cell");
      if (table.pattern[Math.floor(i / table.yLength) + 1][i % table.yLength + 1] === 0) continue;

      const block = document.createElement("div");
      block.id = "block" + i;
      block.classList.add("block");
      block.style["color"]= "${config.lineColor}";
      block.innerText = pattern[table.pattern[Math.floor(i / table.yLength) + 1][i % table.yLength + 1]];
      cell.appendChild(block);

      const number = document.createElement("div");
      number.classList.add("number");
      number.innerText = i;
      block.appendChild(number);
    }
  </script>

  <style>
    #clip {
      position: relative;
      overflow: hidden;
      width: ${2.5 * blockSize};
      height: ${2.5 * blockSize};
    }

    #canvas {
      position: relative;
      bottom: ${2.71 * blockSize};
      right: ${4.25 * blockSize};
      rotate: 15deg;
      width: ${9.2 * blockSize}px;
      height: ${7.2 * blockSize}px;
      display: grid;
      grid-template-columns: 0.6fr repeat(8, 1fr) 0.6fr;
      grid-template-rows: 0.6fr repeat(6, 1fr) 0.6fr;
      background: linear-gradient(to bottom right,
        ${config.backGroundColorStart},
        ${config.backGroundColorEnd});
    }

    .cell {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .block {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 80%;
      height: 80%;
      border-radius: 10%;
      font-size: ${0.4 * blockSize}px;
      box-shadow: ${config.blockShadowColor} ${0.05 * blockSize}px ${
    0.05 * blockSize
  }px;
      background: ${config.blockColor};
    }

    .number {
      position: absolute;
      bottom: ${0.1 * blockSize}px;
      left: ${0.12 * blockSize}px;
      color: ${config.lineColor};
      font-size: ${0.18 * blockSize}px;
    }
  </style>
</body>
  `;
  const img = await ctx.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#clip");
    return await next(canvas);
  });
  return img;
}

async function drawWin(ctx: Context, config: Config) {
  const blockSize = config.blockSize;
  const html: string = `
  <body>
  <div id="canvas">
    <div id="fireworks1">🎇</div>
    <div id="cup">🏆</div>
    <div id="boy">🥳</div>
    <div id="fireworks2">🎆</div>
  </div>
  <style>
    #canvas {
      font-size: ${blockSize}px;
      position: relative;
      width: ${4 * blockSize}px;
      height: ${3 * blockSize}px;
      background: linear-gradient(to bottom right,
          ${config.backGroundColorStart},
          ${config.backGroundColorEnd});
    }

    #boy {
      position: absolute;
      top: 35%;
      left: 40%;
      rotate: 0.4rad;
      font-size: 1.5em;
    }

    #cup {
      position: absolute;
      bottom: 18%;
      rotate: -.1rad;
      font-size: 2em;
    }

    #fireworks1 {
      position: absolute;
      top: -15%;
      left: 60%;
      font-size: 1.5em;
    }

    #fireworks2 {
      position: absolute;
      top: 40%;
      left: -11%;
      font-size: 1.5em;
    }
  </style>
</body>
  `;

  const img = await ctx.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}

async function drawOver(ctx: Context, config: Config) {
  const blockSize = config.blockSize;
  const html = `
  <body>
  <div id="canvas">
    <div id="sadflower">🥀</div>
  </div>
  <style>
    #canvas {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: ${blockSize}px;
      width: ${4 * blockSize}px;
      height: ${3 * blockSize}px;
      background: linear-gradient(to bottom right,
          ${config.backGroundColorStart},
          ${config.backGroundColorEnd});
    }
  </style>
</body>
  `;
  const img = await ctx.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}
