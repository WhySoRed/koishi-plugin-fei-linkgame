import { Context } from "koishi";
import { LinkGame } from "./linkGameMethod";
import { LinkPoint, LinkTable } from "./table";
import { Config } from "../koishi/config";

import {
  draw as canvasDraw,
  drawWin as canvasDrawWin,
  drawWelcome as canvasDrawWelcome,
  drawOver as canvasDrawOver,
} from "./draw/drawCanvas";
import {
  draw as puppeteerDraw,
  drawWelcome as puppeteerDrawWelcome,
  drawWin as puppeteerDrawWin,
  drawOver as puppeteerDrawOver,
} from "./draw/drawPuppeteer";

export class LinkGameDraw {
  pptrOn: boolean;
  ctx: Context;
  config: Config;
  game: (
    linkGame: LinkGame,
    linkPathArr?: LinkPoint[][]
  ) => Promise<string>;
  win: () => Promise<string>;
  welcome: () => Promise<string>;
  over: () => Promise<string>;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.config = ctx.config;
    this.pptrOn = ctx.puppeteer ? true : false;

    this.game = (linkGame,linkPathArr) => {
      return this.pptrOn
        ? puppeteerDraw(ctx, this.config,linkGame,linkGame.table,linkPathArr)
        : canvasDraw(ctx, this.config,linkGame,linkGame.table,linkPathArr);
    };
    this.win = (...args) => {
      return this.pptrOn
        ? puppeteerDrawWin(ctx, this.config)
        : canvasDrawWin(ctx, this.config);
    };
    this.welcome = (...args) => {
      return this.pptrOn
        ? puppeteerDrawWelcome(ctx, this.config)
        : canvasDrawWelcome(ctx, this.config);
    };
    this.over = (...args) => {
      return this.pptrOn
        ? puppeteerDrawOver(ctx, this.config)
        : canvasDrawOver(ctx, this.config);
    };
  }
}
