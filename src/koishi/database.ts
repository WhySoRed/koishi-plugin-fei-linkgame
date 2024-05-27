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
  patternCounts: number;
  timeLimitOn: boolean;
  maxScore: number;
}

export async function extendDatabase(ctx: Context) {
  ctx.database.extend(
    "linkGameData",
    {
      cid: "string",
      xLength: "unsigned",
      yLength: "unsigned",
      patternCounts: "unsigned",
      timeLimitOn: "boolean",
      maxScore: "unsigned",
    },
    {
      primary: ["cid"],
    }
  );
}
