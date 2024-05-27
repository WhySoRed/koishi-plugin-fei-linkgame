import { Context } from "koishi";
import { Config } from "./koishi/config";
import { initDatabase } from "./koishi/database";
import { updateUsage } from "./koishi/usage";
import { command, linkGameTemp } from "./command";
import {} from "@koishijs/plugin-help";

export const inject = {
  required: ["database", "canvas"],
  optional: ["puppeteer"],
};

export const name = "fei-linkgame";
export * from "./koishi/config";
export * from "./koishi/usage";

export function apply(ctx: Context, config: Config) {
  ctx.on("ready", async () => {
    await updateUsage(config);
    await command(ctx, config);
    await initDatabase(ctx);
  });

  ctx.on("dispose", () => {
    linkGameTemp.clearAll();
  });
}