import { Context, Schema } from 'koishi'
import { Table as LinkTable } from './link-class'

export const name = 'link-game-demo'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
}
