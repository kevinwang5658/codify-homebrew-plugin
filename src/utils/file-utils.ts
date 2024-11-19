import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import os, { homedir } from 'node:os';
import path from 'node:path';

const SPACE_REGEX = /^\s*$/

export class FileUtils {
  static async addToStartupFile(line: string): Promise<void> {
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
  }

  static async addAllToStartupFile(lines: string[]): Promise<void> {
    const formattedLines = '\n' + lines.join('\n') + '\n';

    console.log(`Adding to .zshrc:
${lines.join('\n')}`)

    await fs.appendFile(path.join(FileUtils.homeDir(), '.zshrc'), formattedLines)
  }

  static async addPathToZshrc(value: string, prepend: boolean): Promise<void> {
    const zshFile = path.join(os.homedir(), '.zshrc');
    console.log(`Saving path: ${value} to $HOME/.zshrc`);

    if (prepend) {
      await fs.appendFile(zshFile, `\nexport PATH=$PATH:${value};`, { encoding: 'utf8' });
      return;
    }

    await fs.appendFile(zshFile, `\nexport PATH=${value}:$PATH;`, { encoding: 'utf8' });
  }

  static async dirExists(path: string): Promise<boolean> {
    let stat;
    try {
      stat = await fs.stat(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  static async fileExists(path: string): Promise<boolean> {
    let stat;
    try {
      stat = await fs.stat(path);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  static async checkDirExistsOrThrowIfFile(path: string): Promise<boolean> {
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
  }

  static async createDirIfNotExists(path: string): Promise<void> {
    if (!fsSync.existsSync(path)){
      await fs.mkdir(path, { recursive: true });
    }
  }

  static homeDir(): string {
    return os.homedir()
  }

  static async removeLineFromFile(filePath: string, search: RegExp | string): Promise<void> {
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
  }

  static async removeLineFromZshrc(search: RegExp | string): Promise<void> {
    return FileUtils.removeLineFromFile(path.join(homedir(), '.zshrc'), search);
  }

  // Append the string to the end of a file ensuring at least 1 lines of space between.
  // Ex result:
  // something something;
  //
  // newline;
  static appendToFileWithSpacing(file: string, textToInsert: string): string {
    const lines = file.trimEnd().split(/\n/);
    if (lines.length === 0) {
      return textToInsert;
    }

    const endingNewLines = FileUtils.calculateEndingNewLines(lines);
    const numNewLines = endingNewLines === -1
      ? 0
      : Math.max(0, 2 - endingNewLines);
    return lines.join('\n') + '\n'.repeat(numNewLines) + textToInsert
  }

  // This is overly complicated but it can be used to insert into any
  // position in the future
  private static calculateEndingNewLines(lines: string[]): number {
    let counter = 0;
    while(true) {
      const line = lines.at(-counter - 1);

      if (!line) {
        return -1
      }

      if (!SPACE_REGEX.test(line)) {
        return counter;
      }

      counter++;

      // Short circuit here because we don't need to check over 2;
      if (counter > 2) {
        return counter;
      }
    }
  }
}
