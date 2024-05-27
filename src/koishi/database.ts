import { Context } from "koishi";

declare module "koishi" {
  interface Tables {
    linkGameData: LinkGameData;
    linkGameSetting: LinkGameSetting;
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

export interface LinkGameSetting {
  cid: string;
  xLength: number;
  yLength: number;
  patternCounts: number;
  timeLimitOn: boolean;
}

export async function initDatabase(ctx: Context) {
  ctx.database.extend(
    "linkGameData",
    {
      cid: "string",
      maxScore: "unsigned",
    },
    {
      primary: ["cid"],
    }
  );

  ctx.database.extend(
    "linkGameSetting",
    {
      cid: "string",
      xLength: "unsigned",
      yLength: "unsigned",
      patternCounts: "unsigned",
      timeLimitOn: "boolean",
    },
    {
      primary: ["cid"],
    }
  );

  ctx.model.migrate(
    "linkGameData",
    {
      xLength: "unsigned",
      yLength: "unsigned",
      patternCounts: "unsigned",
      timeLimitOn: "boolean",
    },
    async (database) => {
      const data = await database.get("linkGameData", {}, [
        "cid",
        "xLength",
        "yLength",
        "patternCounts",
        "timeLimitOn",
      ]);
      await database.upsert("linkGameSetting", data);
    }
  );
}
