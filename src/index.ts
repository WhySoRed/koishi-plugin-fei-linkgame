import { Context, Schema, h } from 'koishi'
import { Table as LinkTable } from './link-class'
import { draw as linkGameDraw} from './draw'

export const name = 'link-game-demo'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
  const table = new LinkTable(8,6);
  ctx.command('link测试')
  .action(async ({ session }) => {
    const imgUrl = await linkGameDraw(session, table);
    session.send(h.img(imgUrl));
  })
}
