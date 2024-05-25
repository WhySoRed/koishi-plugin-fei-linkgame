import { Table, Point } from "./linkGame";
import { Session, Random } from "koishi";
import {} from "koishi-plugin-puppeteer";
import { Config } from ".";

export async function draw(
  session: Session,
  config: Config,
  patterns: string[],
  table: Table,
  linkPathArr?: Point[][]
) {
  const blockSize = config.blockSize;
  const width = (table.yLength + 2 - 0.8) * blockSize;
  const height = (table.xLength + 2 - 0.8) * blockSize;

  console.log(JSON.stringify(linkPathArr))
  const html = `
<body>
  <div id="canvas">
    <svg xmlns="http://www.w3.org/2000/svg"></svg>
    <script>
      const blockSize = ${blockSize};
      const table = ${JSON.stringify(table)};
      const pattern = [""].concat( ${JSON.stringify(patterns)});
      const linkPathArr = ${JSON.stringify(linkPathArr)};

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
        block.innerText = pattern[table.pattern[Math.floor(i / table.yLength) + 1][i % table.yLength + 1]];
        cell.appendChild(block);
  
        const number = document.createElement("div");
        number.classList.add("number");
        number.innerText = i;
        block.appendChild(number);
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
          circle.setAttribute("fill", "#de3163");
          svg.appendChild(circle);
  
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", xStart * blockSize);
          line.setAttribute("y1", yStart * blockSize);
          line.setAttribute("x2", xEnd * blockSize);
          line.setAttribute("y2", yEnd * blockSize);
          line.setAttribute("stroke", "#de3163");
          line.setAttribute("stroke-width", "" + 0.1 * blockSize);
          svg.appendChild(line);
        }
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", (linkPath[linkPath.length - 1].y + .1 + shifting) * blockSize);
        circle.setAttribute("cy", (linkPath[linkPath.length - 1].x + .1 + shifting) * blockSize);
        circle.setAttribute("r", "" + 0.05 * blockSize);
        circle.setAttribute("fill", "#de3163");
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
      grid-template-columns: 0.6fr repeat(6, 1fr) 0.6fr;
      grid-template-rows: 0.6fr repeat(5, 1fr) 0.6fr;
      background: linear-gradient(to bottom right,
          #002a33,
          #002129);
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
      box-shadow: #00a5bf ${0.05 * blockSize}px ${0.05 * blockSize}px;
      background: #fcf5f7;
    }

    .number {
      position: absolute;
      bottom: ${0.1 * blockSize}px;
      left: ${0.12 * blockSize}px;
      color: #de3163;
      font-size: ${0.18 * blockSize}px;

    }
  </style>
</body>`;
  const img = await session.app.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("#canvas");
    return await next(canvas);
  });
  return img;
}

export async function drawWelcome(session: Session, config: Config) {
  const html: string = `
  <canvas ></canvas>
  `;

  const img = await session.app.puppeteer.render(html, async (page, next) => {
    const canvas = await page.$("body");
    return await next(canvas);
  });
  return img;
}
