import { Context } from "koishi";
import { Config } from "./config";
import { command, linkGameTemp } from "./command";
import {} from "@koishijs/plugin-help";

export const inject = {
  required: ["database", "canvas"],
  optional: ["puppeteer"],
};

export const name = "fei-linkgame";
export * from "./config"

export const usage = `
![logo](https://forum.koishi.xyz/uploads/default/original/2X/4/4282105b1260c080c3e3082177dbb860ae982193.jpeg)
可以在koishi上玩连连看~
小心不要沉迷哦...
`;

declare module "koishi" {
  interface Tables {
    linkGameData: LinkGameData;
  }
}

export interface LinkGameData {
  cid: string;
  xLength: number;
  yLength: number;
  maxPatternTypes: number;
  timeLimitOn: boolean;
  maxScore: number;
}

export function apply(ctx: Context, config: Config) {
  ctx.on("ready", async () => {
    ctx.database.extend(
      "linkGameData",
      {
        cid: "string",
        xLength: { type: "unsigned", initial: 5 },
        yLength: { type: "unsigned", initial: 6 },
        maxPatternTypes: { type: "unsigned", initial: 9 },
        timeLimitOn: { type: "boolean", initial: true },
        maxScore: { type: "unsigned", initial: 0 },
      },
      {
        primary: ["cid"],
      }
    );
    await command(ctx, config);
  });

  ctx.on("dispose", () => {
    linkGameTemp.clearAll();
  });
}