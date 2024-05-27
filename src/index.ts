import { Context } from "koishi";
import { Config } from "./config";
import { extendDatabase } from "./database";
import { updateUsage } from "./usage";
import { command, linkGameTemp } from "./command";
import {} from "@koishijs/plugin-help";

export const inject = {
  required: ["database", "canvas"],
  optional: ["puppeteer"],
};

export const name = "fei-linkgame";
export * from "./config";
export * from "./usage";

export function apply(ctx: Context, config: Config) {
  ctx.on("ready", async () => {
    await updateUsage(config);
    await command(ctx, config);
    await extendDatabase(ctx);
  });

  ctx.on("dispose", () => {
    linkGameTemp.clearAll();
  });
}