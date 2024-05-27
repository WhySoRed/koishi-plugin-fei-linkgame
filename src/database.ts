import { Context } from "koishi";

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

export async function extendDatabase(ctx: Context) {
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

}
