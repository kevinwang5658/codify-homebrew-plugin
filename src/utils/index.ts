import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

import { SpawnStatus, codifySpawn } from './codify-spawn.js';
import { SpotlightKind, SpotlightUtils } from './spotlight-search.js';

export const Utils = {
  async findApplication(name: string): Promise<string[]> {
    const [
      spotlightResult,
      applicationDir
    ] = await Promise.all([
      SpotlightUtils.mdfind(name, SpotlightKind.APPLICATION),
      Utils.findInFolder('/Applications', name)
    ])

    return [...new Set([...spotlightResult, ...applicationDir])]
  },

  async findInFolder(dir: string, search: string): Promise<string[]> {
    const data = await fs.readdir(dir);

    return data
      .filter((l) => l.includes(search))
      .map((l) => path.join(dir, l));
  },

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

    await fs.mkdir(path, { recursive: true })
  },

  async findInstallLocation(name: string): Promise<null | string> {
    const query = await codifySpawn(`which ${name}`, { throws: false });
    if (query.status === SpawnStatus.ERROR) {
      return null;
    }

    return query.data.trim();
  },

  async isArmArch(): Promise<boolean> {
    const query = await codifySpawn('sysctl -n machdep.cpu.brand_string');
    return /M(\d)/.test(query.data);
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

  async downloadUrlIntoFile(filePath: string, url: string): Promise<void> {
    const { body } = await fetch(url)

    const dirname = path.dirname(filePath);
    if (!await fs.stat(dirname).then((s) => s.isDirectory()).catch(() => false)) {
      await fs.mkdir(dirname, { recursive: true });
    }

    const ws = fsSync.createWriteStream(filePath)
    // Different type definitions here for readable stream (NodeJS vs DOM). Small hack to fix that
    await finished(Readable.fromWeb(body as never).pipe(ws));
  },

  getUser(): string {
    return os.userInfo().username;
  }
};
