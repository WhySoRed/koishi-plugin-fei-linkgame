import { LinkTable, LinkPoint } from "./../linkGameMethods";
import { Session, Random } from "koishi";
import {} from "koishi-plugin-puppeteer";
import { Config } from "./../config";

export async function draw(
  session: Session,
  config: Config,
  patterns: string[],
  patternColors: string[],
  table: LinkTable,
  linkPathArr: LinkPoint[][],
  timeLeft?: number,
  timeLimit?: number
) {
  const blockSize = config.blockSize;
  const width = (table.yLength + 2 - 0.8) * blockSize;
  const height = timeLimit
    ? (table.xLength + 2) * blockSize
    : (table.xLength + 2 - 0.8) * blockSize;
  const timeStartColor = config.timeStartColor;
  const timeEndColor = config.timeEndColor;
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
      grid-template-rows: 0.6fr repeat(${table.xLength}, 1fr)  ${timeLimit?"0.4fr 1fr":"0.6fr"};
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
      box-shadow: ${config.blockShadowColor} ${0.05 * blockSize}px ${0.05 * blockSize}px;
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
  console.log(html);
  const img = await session.app.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}

export async function drawWelcome(session: Session, config: Config) {
  const blockSize = config.blockSize;
  const randomPatternArr = new Random().shuffle(config.pattermType).slice(0, 4);
  const html: string = `
  <body>
  <div id="canvas">
    <div id="emoji1" class="emoji">${randomPatternArr[0]}</div>
    <div id="emoji3" class="emoji">${randomPatternArr[1]}</div>
    <div id="emoji4" class="emoji">${randomPatternArr[2]}</div>
    <div id="emoji2" class="emoji">${randomPatternArr[3]}</div>
    <div id="mask"></div>
    <svg>
      <line x1="${2.55 * blockSize}" y1="${-0.5 * blockSize}"
        x2="${1.05 * blockSize}" y2="${1.0 * blockSize}"
        stroke="${config.blockColor}" stroke-width="${0.1 * blockSize}" />
      <circle cx="${1.05 * blockSize}" cy="${1.05 * blockSize}"
        r="${0.05 * blockSize}" fill="${config.lineColor}" />
      <line x1="${1.05 * blockSize}" y1="${1.0 * blockSize}"
        x2="${2.05 * blockSize}" y2="${2.0 * blockSize}" 
        stroke="${config.blockColor}" stroke-width="${0.1 * blockSize}" />
      <circle cx="${2.05 * blockSize}" cy="${2.05 * blockSize}" 
        r="${0.05 * blockSize}" fill="${config.lineColor}" />
      <line x1="${2.05 * blockSize}" y1="${2.0 * blockSize}" 
        x2="${1.05 * blockSize}" y2="${3.0 * blockSize}" 
        stroke="${config.blockColor}" stroke-width="${0.1 * blockSize}" />
    </svg>
    <svg>
      <line x1="${2.5 * blockSize}" y1="${-0.5 * blockSize}" 
        x2="${1.0 * blockSize}" y2="${1.0 * blockSize}" 
        stroke="${config.lineColor}" stroke-width="${0.1 * blockSize}" />
      <circle cx="${1.0 * blockSize}" 
        cy="${1.0 * blockSize}" r="${0.05 * blockSize}" fill="${
    config.lineColor
  }" />
      <line x1="${1.0 * blockSize}" y1="${1.0 * blockSize}" 
        x2="${2.0 * blockSize}" y2="${2.0 * blockSize}" 
        stroke="${config.lineColor}" stroke-width="${0.1 * blockSize}" />
      <circle cx="${2.0 * blockSize}" cy="${2.0 * blockSize}" 
        r="${0.05 * blockSize}" fill="${config.lineColor}" />
      <line x1="${2.0 * blockSize}" y1="${2.0 * blockSize}" 
        x2="${1.0 * blockSize}" y2="${3.0 * blockSize}" 
        stroke="${config.lineColor}" stroke-width="${0.1 * blockSize}" />
    </svg>
    <div id="boy">🤔</div>
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

    div,
    svg,
    canvas {
      position: absolute;
    }

    #emoji1 {
      top: 0%;
      left: 0%;
      font-size: 1.7em;
      rotate: -0.4rad;
    }

    #emoji2 {
      top: 25%;
      right: -7%;
      font-size: 1.2em;
      rotate: 0.3rad;
    }

    #emoji3 {
      bottom: 50%;
      left: 47%;
      font-size: 1.3em;
      rotate: 0.4rad;
    }

    #emoji4 {
      bottom: 5%;
      right: 44%;
      font-size: 1.5em;
      rotate: -0.1rad;
    }

    #mask {
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: ${config.lineColor};
      opacity: 0.4;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  </style>
</body>
  `;
  const img = await session.app.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}

export async function drawWin(session: Session, config: Config) {
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

  const img = await session.app.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}

export async function drawOver(session: Session, config: Config) {
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
  const img = await session.app.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}
