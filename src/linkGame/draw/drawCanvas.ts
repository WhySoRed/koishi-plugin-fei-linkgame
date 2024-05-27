import { LinkPoint, LinkGame } from "../class";
import { Random, Context } from "koishi";
import {} from "koishi-plugin-canvas";
import { Config } from "../../koishiConfig";

export { draw, drawOver, drawWelcome, drawWin };

async function draw(
  koishiCtx: Context,
  config: Config,
  linkGame: LinkGame,
  linkPathArr?: LinkPoint[][],
): Promise<string> {
  const blockSize = config.blockSize;
  const timeStartColor = config.timeStartColor;
  const timeEndColor = config.timeEndColor;

  const table = linkGame.table;
  const patterns = linkGame.patterns;
  const patternColors = linkGame.patternColors;
  const timeLeft = linkGame.timeLeft;
  const timeLimit = linkGame.timeLimit;

  const pattern = [""].concat(patterns);
  const width = (table.yLength + 2 - 0.8) * blockSize;
  const height = timeLimit
    ? (table.xLength + 2) * blockSize
    : (table.xLength + 2 - 0.8) * blockSize;

  const patternBlockCanvas = await koishiCtx.canvas.createCanvas(
    blockSize,
    blockSize
  );

  const ctxBlock = patternBlockCanvas.getContext("2d");

  ctxBlock.beginPath();
  ctxBlock.moveTo(0.2 * blockSize, 0.1 * blockSize);
  ctxBlock.lineTo(0.8 * blockSize, 0.1 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.9 * blockSize,
    0.1 * blockSize,
    0.9 * blockSize,
    0.2 * blockSize
  );
  ctxBlock.lineTo(0.9 * blockSize, 0.8 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.9 * blockSize,
    0.9 * blockSize,
    0.8 * blockSize,
    0.9 * blockSize
  );
  ctxBlock.lineTo(0.2 * blockSize, 0.9 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.1 * blockSize,
    0.9 * blockSize,
    0.1 * blockSize,
    0.8 * blockSize
  );
  ctxBlock.lineTo(0.1 * blockSize, 0.2 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.1 * blockSize,
    0.1 * blockSize,
    0.2 * blockSize,
    0.1 * blockSize
  );
  ctxBlock.closePath();
  ctxBlock.fillStyle = config.blockColor;
  ctxBlock.fill();
  const block = await patternBlockCanvas.toDataURL("image/png");
  ctxBlock.fillStyle = config.blockShadowColor;
  ctxBlock.fill();
  const blockShadow = await patternBlockCanvas.toDataURL("image/png");

  const canvas = await koishiCtx.canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, config.backGroundColorStart);
  gradient.addColorStop(1, config.backGroundColorEnd);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const patternBlock = await koishiCtx.canvas.loadImage(block);
  const patternBlockShadow = await koishiCtx.canvas.loadImage(blockShadow);

  ctx.translate(-0.4 * blockSize, -0.4 * blockSize);

  ctx.fillStyle = config.blockColor;
  ctx.font = `${0.4 * blockSize}px`;
  for (let i = 0; i < table.yLength + 2; i++) {
    for (let j = 0; j < table.xLength + 2; j++) {
      if (table.pattern[j][i]) {
        ctx.save();
        ctx.drawImage(
          patternBlockShadow,
          (i + 0.05) * blockSize,
          (j + 0.05) * blockSize
        );
        ctx.drawImage(patternBlock, i * blockSize, j * blockSize);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = patternColors[table.pattern[j][i]];
        ctx.fillText(
          pattern[table.pattern[j][i]],
          i * blockSize + 0.25 * blockSize,
          j * blockSize + 0.65 * blockSize
        );
        ctx.restore();

        ctx.save();
        ctx.fillStyle = config.lineColor;
        ctx.font = `${0.2 * blockSize}px`;
        ctx.fillText(
          (j - 1) * table.yLength + (i - 1) + "",
          i * blockSize + 0.15 * blockSize,
          j * blockSize + 0.85 * blockSize
        );
        ctx.restore();
      }
    }
  }
  if (linkPathArr) {
    ctx.translate(
      -0.03 * blockSize * Math.floor(linkPathArr.length / 2),
      -0.03 * blockSize * Math.floor(linkPathArr.length / 2)
    );
  }
  for (const i in linkPathArr) {
    const linkPath = linkPathArr[i];
    if (linkPath.length) {
      ctx.strokeStyle = config.lineColor;
      ctx.lineWidth = 0.1 * blockSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.translate(0.03 * blockSize, 0.03 * blockSize);
      ctx.moveTo(
        linkPath[0].y * blockSize + 0.5 * blockSize,
        linkPath[0].x * blockSize + 0.5 * blockSize
      );
      for (let i = 1; i < linkPath.length; i++) {
        let drawpointX: number;
        let drawpointY: number;
        if (linkPath[i].y === 0)
          drawpointX = linkPath[i].y * blockSize + 0.8 * blockSize;
        else if (linkPath[i].y === table.yLength + 1)
          drawpointX = linkPath[i].y * blockSize + 0.2 * blockSize;
        else drawpointX = linkPath[i].y * blockSize + 0.5 * blockSize;

        if (linkPath[i].x === 0)
          drawpointY = linkPath[i].x * blockSize + 0.8 * blockSize;
        else if (linkPath[i].x === table.xLength + 1)
          drawpointY = linkPath[i].x * blockSize + 0.2 * blockSize;
        else drawpointY = linkPath[i].x * blockSize + 0.5 * blockSize;

        ctx.lineTo(drawpointX, drawpointY);
        ctx.stroke();
      }
    }
  }

  ctx.translate(0.4 * blockSize, 0.4 * blockSize);

  if (timeLimit) {
    const timeWidth = (table.yLength - 0.4) * blockSize;
    const timeHeight = 0.2 * blockSize;
    const timeGradient = ctx.createLinearGradient(0, 0, timeWidth, 0);
    timeGradient.addColorStop(1, timeStartColor);
    timeGradient.addColorStop(0, timeEndColor);

    ctx.save();
    ctx.fillStyle = config.lineColor;
    ctx.fillRect(
      0.8 * blockSize,
      (table.xLength + 1.4) * blockSize,
      timeWidth,
      timeHeight
    );
    ctx.restore();
    ctx.save();
    ctx.fillStyle = timeGradient;
    ctx.fillRect(
      0.8 * blockSize,
      (table.xLength + 1.4) * blockSize,
      (timeLeft / timeLimit) * timeWidth,
      timeHeight
    );
  }

  return `<img src="${await canvas.toDataURL("image/png")}" />`;
}

async function drawWin(koishiCtx: Context, config: Config) {
  const blockSize = config.blockSize;
  const canvas = await koishiCtx.canvas.createCanvas(
    4 * blockSize,
    3 * blockSize
  );
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 4 * blockSize, 3 * blockSize);
  gradient.addColorStop(0, config.backGroundColorStart);
  gradient.addColorStop(1, config.backGroundColorEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4 * blockSize, 3 * blockSize);

  ctx.save();
  ctx.font = `${1.5 * blockSize}px`;
  ctx.rotate(0);
  ctx.fillText("🎇", 2.5 * blockSize, 1 * blockSize);
  ctx.restore();

  ctx.save();
  ctx.font = `${2 * blockSize}px`;
  ctx.rotate(-0.1);
  ctx.fillText("🏆", 0 * blockSize, 2 * blockSize);
  ctx.restore();

  ctx.save();
  ctx.font = `${1.5 * blockSize}px`;
  ctx.rotate(0.4);
  ctx.fillText("🥳", 2.2 * blockSize, 1.5 * blockSize);
  ctx.restore();

  ctx.save();
  ctx.font = `${1.5 * blockSize}px`;
  ctx.rotate(0);
  ctx.fillText("🎆", -0.5 * blockSize, 2.8 * blockSize);
  ctx.restore();

  return `<img src="${await canvas.toDataURL("image/png")}" />`;
}

async function drawWelcome(koishiCtx: Context, config: Config) {
  const blockSize = config.blockSize;
  const table = {
    xLength: 6,
    yLength: 8,
    maxPatternTypes: 9,
    pattern: [
      [],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 2, 2 /**/, 1 /**/, 0, 0, 0],
      [0, 0, 4, 4, 2, 3 /**/, 4 /**/, 4, 0, 0],
      [0, 0, 0, 0, 3, 2 /**/, 3, 1, 4, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [],
    ],
  };
  const randomPatternArr = new Random().shuffle(config.pattermType).slice(0, 4);
  const pattern = [""].concat(randomPatternArr);
  const width = (table.yLength + 2 - 0.8) * blockSize;
  const height = (table.xLength + 2 - 0.8) * blockSize;

  const xShifting = -4.41 * blockSize;
  const yShifting = -2.41 * blockSize;

  const canvas = await koishiCtx.canvas.createCanvas(
    2.5 * blockSize,
    2.5 * blockSize
  );
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, config.backGroundColorStart);
  gradient.addColorStop(1, config.backGroundColorEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(xShifting, yShifting, 9.2 * blockSize, 7.2 * blockSize);

  const patternBlockCanvas = await koishiCtx.canvas.createCanvas(
    blockSize,
    blockSize
  );

  const ctxBlock = patternBlockCanvas.getContext("2d");

  ctxBlock.beginPath();
  ctxBlock.moveTo(0.2 * blockSize, 0.1 * blockSize);
  ctxBlock.lineTo(0.8 * blockSize, 0.1 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.9 * blockSize,
    0.1 * blockSize,
    0.9 * blockSize,
    0.2 * blockSize
  );
  ctxBlock.lineTo(0.9 * blockSize, 0.8 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.9 * blockSize,
    0.9 * blockSize,
    0.8 * blockSize,
    0.9 * blockSize
  );
  ctxBlock.lineTo(0.2 * blockSize, 0.9 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.1 * blockSize,
    0.9 * blockSize,
    0.1 * blockSize,
    0.8 * blockSize
  );
  ctxBlock.lineTo(0.1 * blockSize, 0.2 * blockSize);
  ctxBlock.quadraticCurveTo(
    0.1 * blockSize,
    0.1 * blockSize,
    0.2 * blockSize,
    0.1 * blockSize
  );
  ctxBlock.closePath();
  ctxBlock.fillStyle = config.blockColor;
  ctxBlock.fill();
  const block = await patternBlockCanvas.toDataURL("image/png");
  ctxBlock.fillStyle = config.blockShadowColor;
  ctxBlock.fill();
  const blockShadow = await patternBlockCanvas.toDataURL("image/png");

  const patternBlock = await koishiCtx.canvas.loadImage(block);
  const patternBlockShadow = await koishiCtx.canvas.loadImage(blockShadow);

  ctx.translate(-0.4 * blockSize, -0.4 * blockSize);

  ctx.fillStyle = config.blockColor;
  ctx.font = `${0.4 * blockSize}px`;
  for (let i = 0; i < table.yLength + 2; i++) {
    for (let j = 0; j < table.xLength + 2; j++) {
      if (table.pattern[j][i]) {
        ctx.save();
        ctx.drawImage(
          patternBlockShadow,
          xShifting + (i + 0.05) * blockSize,
          yShifting + (j + 0.05) * blockSize
        );
        ctx.drawImage(
          patternBlock,
          xShifting + i * blockSize,
          yShifting + j * blockSize
        );
        ctx.restore();
        ctx.save();
        ctx.fillStyle = config.lineColor;
        ctx.fillText(
          pattern[table.pattern[j][i]],
          xShifting + i * blockSize + 0.25 * blockSize,
          yShifting + j * blockSize + 0.65 * blockSize
        );
        ctx.restore();

        ctx.save();
        ctx.fillStyle = config.lineColor;
        ctx.font = `${0.2 * blockSize}px`;
        ctx.fillText(
          (j - 1) * table.yLength + (i - 1) + "",
          xShifting + i * blockSize + 0.15 * blockSize,
          yShifting + j * blockSize + 0.85 * blockSize
        );
        ctx.restore();
      }
    }
  }

  ctx.translate(0.4 * blockSize, 0.4 * blockSize);

  ctx.rotate(0.2618);

  return `<img src="${await canvas.toDataURL("image/png")}" />`;
}

async function drawOver(koishiCtx: Context, config: Config) {
  const blockSize = config.blockSize;
  const canvas = await koishiCtx.canvas.createCanvas(
    4 * blockSize,
    3 * blockSize
  );
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 4 * blockSize, 3 * blockSize);
  gradient.addColorStop(0, config.backGroundColorStart);
  gradient.addColorStop(1, config.backGroundColorEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4 * blockSize, 3 * blockSize);

  ctx.save();
  ctx.font = `${1.2 * blockSize}px`;
  ctx.rotate(0);
  ctx.fillText("🥀", 1.2 * blockSize, 2.1 * blockSize);
  ctx.restore();

  return `<img src="${await canvas.toDataURL("image/png")}" />`;
}
