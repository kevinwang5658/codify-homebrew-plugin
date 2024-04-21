import * as fs from 'node:fs/promises';

export class FileUtils {
  static async removeLineFromFile(filePath: string, search: string | RegExp): Promise<void> {
    const file = await fs.readFile(filePath, 'utf8')
    const lines = file.split('\n');

    let searchRegex = undefined;
    let searchString = undefined;

    if (typeof search === 'object') {
      const startRegex = /^([ \t]*)?/;
      const endRegex = /([ \t]*)?/;

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
  }
}
