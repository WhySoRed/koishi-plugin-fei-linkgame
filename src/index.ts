import { Context } from "koishi";
import { Config } from "./koishiConfig";
import { extendDatabase } from "./koishiDatabase";
import { updateUsage } from "./koishiUsage";
import { command, linkGameTemp } from "./command";
import {} from "@koishijs/plugin-help";

export const inject = {
  required: ["database", "canvas"],
  optional: ["puppeteer"],
};

export const name = "fei-linkgame";
export * from "./koishiConfig";
export * from "./koishiUsage";

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