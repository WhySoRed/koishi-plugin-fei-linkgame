import { Context, Session } from "koishi";
import { Table as LinkTable, Point as LinkPoint, Table } from "./linkGame";
import { Config } from "./config";

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
  game: (  session: Session,
    config: Config,
    patterns: string[],
    patternColors: string[],
    table: LinkTable,
    linkPathArr: LinkPoint[][],
    timeLimit?: number,
    timeLimitMax?: number)=>Promise<string>;
  win: (
    session: Session,
    config: Config)=>Promise<string>;
  welcome: (
    session: Session,
    config: Config)=>Promise<string>;
  over: (
    session: Session,
    config: Config)=>Promise<string>;

  constructor(ctx:Context) {
    this.pptrOn = ctx.puppeteer ? true : false;
    this.game = this.pptrOn ? puppeteerDraw : canvasDraw;
    this.win = this.pptrOn ? puppeteerDrawWin : canvasDrawWin;
    this.welcome = this.pptrOn ? puppeteerDrawWelcome : canvasDrawWelcome;
    this.over = this.pptrOn ? puppeteerDrawOver : canvasDrawOver;
  }

}