import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import os, { homedir } from 'node:os';
import path from 'node:path';

import { codifySpawn } from './codify-spawn.js';
import { Utils } from './index.js';
import { untildify } from './untildify.js';

export const FileUtils = {
  async addToStartupFile(line: string): Promise<void> {
    const lineToInsert = addLeadingSpacer(
      addTrailingSpacer(line)
    );

    await fs.appendFile(path.join(FileUtils.homeDir(), '.zshrc'), lineToInsert)

    function addLeadingSpacer(line: string): string {
      return line.startsWith('\n')
        ? line
        : '\n' + line;
    }

    function addTrailingSpacer(line: string): string {
      return line.endsWith('\n')
        ? line
        : line + '\n';
    }
  },

  async addAllToStartupFile(lines: string[]): Promise<void> {
    const formattedLines = '\n' + lines.join('\n') + '\n';

    console.log(`Adding to .zshrc:
${lines.join('\n')}`)

    await fs.appendFile(path.join(FileUtils.homeDir(), '.zshrc'), formattedLines)
  },

  async addPathToZshrc(path: string, prepend: boolean): Promise<void> {
    const escapedPath = Utils.shellEscape(untildify(path))

    if (prepend) {
      await codifySpawn(`echo "path=(${escapedPath} \\$path)\\n" >> $HOME/.zshrc`)
      return;
    }

    await codifySpawn(`echo "path+=('${escapedPath}')\\n" >> $HOME/.zshrc`)
  },

  async dirExists(path: string): Promise<boolean> {
    let stat;
    try {
      stat = await fs.stat(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  },

  async fileExists(path: string): Promise<boolean> {
    let stat;
    try {
      stat = await fs.stat(path);
      return stat.isFile();
    } catch {
      return false;
    }
  },

  async checkDirExistsOrThrowIfFile(path: string): Promise<boolean> {
    let stat;
    try {
      stat = await fs.stat(path);
    } catch {
      return false;
    }

    if (stat.isDirectory()) {
      return true;
    }
 
    throw new Error(`Directory ${path} already exists and is a file`);
  },

  async createDirIfNotExists(path: string): Promise<void> {
    if (!fsSync.existsSync(path)){
      await fs.mkdir(path, { recursive: true });
    }
  },

  homeDir(): string {
    return os.homedir()
  },

  async removeLineFromFile(filePath: string, search: RegExp | string): Promise<void> {
    const file = await fs.readFile(filePath, 'utf8')
    const lines = file.split('\n');

    let searchRegex;
    let searchString;

    if (typeof search === 'object') {
      const startRegex = /^([\t ]*)?/;
      const endRegex = /([\t ]*)?/;

      // Augment regex with spaces criteria to make sure this function is not deleting lines that are comments or has other content.
      searchRegex = search
        ? new RegExp(
          startRegex.source + search.source + endRegex.source,
          search.flags
        )
        : search;
    }

    if (typeof search === 'string') {
      searchString = search;
    }

    for (let counter = lines.length; counter >= 0; counter--) {
      if (!lines[counter]) {
        continue;
      }

      if (searchString && lines[counter].includes(searchString)) {
        lines.splice(counter, 1);
        continue;
      }

      if (searchRegex && lines[counter].search(searchRegex) !== -1) {
        lines.splice(counter, 1);
      }
    }

    await fs.writeFile(filePath, lines.join('\n'));
  },

  async removeLineFromZshrc(search: RegExp | string): Promise<void> {
    return FileUtils.removeLineFromFile(path.join(homedir(), '.zshrc'), search);
  },
};
