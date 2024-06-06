import { Context } from "koishi";
import { Config, updateConfig } from "./koishi/config";
import { initDatabase } from "./koishi/database";
import { updateUsage } from "./koishi/usage";
import { registerCommand } from "./command";
import { disposeLinkGame, initLinkGame } from "./linkGame/linkGame";

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
    await updateConfig(config);
    await initDatabase(ctx);
    await registerCommand(ctx);
    initLinkGame(ctx);
  });

  ctx.on("dispose", () => {
    disposeLinkGame();
  });
}