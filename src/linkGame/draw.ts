import { Context } from "koishi";
import { LinkGame } from "./linkGame";
import { LinkPoint, LinkTable } from "./linkTable";
import {
  draw as cDraw,
  drawWin as cDrawWin,
  drawWelcome as cDrawWelcome,
  drawOver as cDrawOver,
} from "./draw/drawCanvas";
import {
  draw as pDraw,
  drawWelcome as pDrawWelcome,
  drawWin as pDrawWin,
  drawOver as pDrawOver,
} from "./draw/drawPuppeteer";

export class LinkGameDraw {
  pptrOn: boolean;
  ctx: Context;
  game: (linkGame: LinkGame,linkTable:LinkTable, linkPathArr?: LinkPoint[][]) => Promise<string>;
  win: () => Promise<string>;
  welcome: () => Promise<string>;
  over: () => Promise<string>;

  constructor(ctx?: Context) {
    this.ctx = ctx;
    this.pptrOn = ctx.puppeteer ? true : false;

    this.game = (linkGame, linkTable,linkPathArr) => {
      return this.pptrOn
        ? pDraw(this.ctx,  linkGame, linkTable, linkPathArr)
        : cDraw(this.ctx,  linkGame, linkTable, linkPathArr);
    };
    this.win = (...args) => {
      return this.pptrOn
        ? pDrawWin(this.ctx)
        : cDrawWin(this.ctx);
    };
    this.welcome = (...args) => {
      return this.pptrOn
        ? pDrawWelcome(this.ctx)
        : cDrawWelcome(this.ctx);
    };
    this.over = (...args) => {
      return this.pptrOn
        ? pDrawOver(this.ctx)
        : cDrawOver(this.ctx);
    };
  }
}
