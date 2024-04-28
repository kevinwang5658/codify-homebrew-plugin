import { codifySpawn, SpawnStatus } from './codify-spawn.js';
import * as fs from 'node:fs/promises';

export class Utils {
  static async isArmArch(): Promise<boolean> {
    const query = await codifySpawn('uname -m');
    return query.data.includes('arm');
  }

  static async isRosetta2Installed(): Promise<boolean> {
    const query = await codifySpawn('arch -x86_64 /usr/bin/true 2> /dev/null', { throws: false });
    return query.status === SpawnStatus.SUCCESS;
  }

  static async isHomebrewInstalled(): Promise<boolean> {
    const query = await codifySpawn('which brew', { throws: false });
    return query.status === SpawnStatus.SUCCESS;
  }

  static async findInstallLocation(name: string): Promise<string | null> {
    const query = await codifySpawn(`which ${name}`, { throws: false });
    if (query.status === SpawnStatus.ERROR) {
      return null;
    }

    return query.data.trim();
  }

  static async isDirectoryOnPath(directory: string): Promise<boolean> {
    const pathQuery = await codifySpawn('echo $PATH');
    return pathQuery.data.includes(directory);
  }

  static async createBinDirectoryIfNotExists(): Promise<void> {
    const path = '/usr/local/bin';

    let lstat = null;
    try {
      lstat = await fs.lstat('/usr/local/bin')
    } catch {}

    if (lstat && lstat.isDirectory()) {
      return;
    }

    if (lstat && !lstat.isDirectory()) {
      throw new Error('Found file at /usr/local/bin. Cannot create a directory there')
    }

    await codifySpawn('sudo mkdir -p -m 775 /usr/local/bin')
  }

  static async createDirectoryIfNotExists(path: string): Promise<void> {
    let lstat = null;
    try {
      lstat = await fs.lstat(path)
    } catch {}

    if (lstat && lstat.isDirectory()) {
      return;
    }

    if (lstat && !lstat.isDirectory()) {
      throw new Error(`Found file at ${path}. Cannot create a directory there`)
    }

    await codifySpawn(`mkdir -p ${path}`)
  }
}
