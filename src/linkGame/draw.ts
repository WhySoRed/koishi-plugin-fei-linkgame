import { Context } from "koishi";
import { LinkGame } from "./linkGameMethod";
import { LinkPoint } from "./table";
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
  game: (
    config: Config,
    linkGame: LinkGame,
    linkPathArr?: LinkPoint[][]
  ) => Promise<string>;
  win: (config: Config) => Promise<string>;
  welcome: (config: Config) => Promise<string>;
  over: (config: Config) => Promise<string>;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.pptrOn = ctx.puppeteer ? true : false;

    this.game = (...args) => {
      return this.pptrOn
        ? puppeteerDraw(ctx, ...args)
        : canvasDraw(ctx, ...args);
    };
    this.win = (...args) => {
      return this.pptrOn
        ? puppeteerDrawWin(ctx, ...args)
        : canvasDrawWin(ctx, ...args);
    };
    this.welcome = (...args) => {
      return this.pptrOn
        ? puppeteerDrawWelcome(ctx, ...args)
        : canvasDrawWelcome(ctx, ...args);
    };
    this.over = (...args) => {
      return this.pptrOn
        ? puppeteerDrawOver(ctx, ...args)
        : canvasDrawOver(ctx, ...args);
    };
  }
}
