import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import os, { homedir } from 'node:os';
import path from 'node:path';

import { codifySpawn } from './codify-spawn.js';
import { Utils } from './index.js';
import { untildify } from './untildify.js';

export const FileUtils = {
  async addAliasToZshrc(alias: string, value: string): Promise<void> {
    const escapedValue = Utils.shellEscape(value);

    await codifySpawn(`echo "alias ${alias}=${escapedValue}" >> $HOME/.zshrc`)
  },

  async addToStartupFile(line: string): Promise<void> {
    const lineToInsert = line.endsWith('\n') ? line : line + '\n';

    await fs.appendFile(path.join(FileUtils.homeDir(), '.zshrc'), lineToInsert)
  },


  async addPathToZshrc(path: string, prepend: boolean): Promise<void> {
    const escapedPath = Utils.shellEscape(untildify(path))

    if (prepend) {
      await codifySpawn(`echo "path=(${escapedPath} \\$path)\\n" >> $HOME/.zshrc`)
      return;
    }

    await codifySpawn(`echo "path+=('${escapedPath}')\\n" >> $HOME/.zshrc`)
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
        // Check that the line only contains white space other than matched portion
        const reducedLine = lines[counter].replace(searchString, '');

        // Line contains non space characters
        if ([...reducedLine].some((character) => character !== ' ' && character !== '\t')) {
          continue;
        }

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
