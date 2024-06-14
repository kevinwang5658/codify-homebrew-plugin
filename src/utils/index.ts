import * as fs from 'node:fs/promises';

import { SpawnStatus, codifySpawn } from './codify-spawn.js';

export const Utils = {
  async createBinDirectoryIfNotExists(): Promise<void> {
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
  },

  async createDirectoryIfNotExists(path: string): Promise<void> {
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
  },

  async findInstallLocation(name: string): Promise<null | string> {
    const query = await codifySpawn(`which ${name}`, { throws: false });
    if (query.status === SpawnStatus.ERROR) {
      return null;
    }

    return query.data.trim();
  },

  async isArmArch(): Promise<boolean> {
    const query = await codifySpawn('uname -m');
    return query.data.includes('arm');
  },

  async isDirectoryOnPath(directory: string): Promise<boolean> {
    const pathQuery = await codifySpawn('echo $PATH');
    return pathQuery.data.includes(directory);
  },

  async isHomebrewInstalled(): Promise<boolean> {
    const query = await codifySpawn('which brew', { throws: false });
    return query.status === SpawnStatus.SUCCESS;
  },

  async isRosetta2Installed(): Promise<boolean> {
    const query = await codifySpawn('arch -x86_64 /usr/bin/true 2> /dev/null', { throws: false });
    return query.status === SpawnStatus.SUCCESS;
  },
  
  shellEscape(arg: string): string {
    if (/[^\w/:=-]/.test(arg)) return arg.replaceAll(/([ !"#$%&'()*;<>?@[\\\]`{}~])/g, '\\$1')
    return arg;
  },
};
