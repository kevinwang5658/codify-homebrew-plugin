import { codifySpawn } from './codify-spawn.js';

export enum SpotlightKind {
  APPLICATION = 'kind:application',
  AUDIO = 'kind:audio',
  BOOKMARK = 'kind:bookmark',
  FOLDER = 'kind:folder',
}

export class SpotlightUtils {

  static async mdfind(search: string, kind?: SpotlightKind): Promise<string[]> {
    const { data } = await codifySpawn(`mdfind ${kind ? kind.toString() : ''} ${search}`)

    return data.split(/\n/)
      .filter((l) => l.startsWith('/'))
  }

}
