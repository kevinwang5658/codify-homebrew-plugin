import { describe, expect, it } from 'vitest';
import * as mock from 'mock-fs'
import { FileUtils } from './file-utils.js';
import * as fs from 'node:fs/promises';

describe('File Utils test', async () => {
  it('Can remove a string from a file using a string match', async () => {
    mock.default({
      'dir': {
        '.zshrc': 'test-string-here $$\necho\t\t\n',
      },
    });

    await FileUtils.removeLineFromFile('dir/.zshrc', 'test-string-here $$')

    const updatedFile = await fs.readFile('dir/.zshrc', 'utf8');
    expect(updatedFile).to.eq('echo\t\t\n');

    mock.restore();
  })

  it('Can remove a string from a file using a regex match', async () => {
    mock.default({
      'dir': {
        '.zshrc': 'test-string-here $$\necho\t\t\n',
      },
    });

    await FileUtils.removeLineFromFile('dir/.zshrc', /test-string-here \$\$/)

    const updatedFile = await fs.readFile('dir/.zshrc', 'utf8');
    expect(updatedFile).to.eq('echo\t\t\n');

    mock.restore();
  })

  it('String match will not match line with additional characters', async () => {
    mock.default({
      'dir': {
        '.zshrc': '# test-string-here $$\necho\t\t\n',
      },
    });

    await FileUtils.removeLineFromFile('dir/.zshrc', 'test-string-here $$')

    const updatedFile = await fs.readFile('dir/.zshrc', 'utf8');
    expect(updatedFile).to.eq('# test-string-here $$\necho\t\t\n');

    mock.restore();
  })

  it('String match will match line with additional spaces', async () => {
    mock.default({
      'dir': {
        '.zshrc': '\t\t   test-string-here $$\t\t\t     \necho\t\t\n',
      },
    });

    await FileUtils.removeLineFromFile('dir/.zshrc', 'test-string-here $$')

    const updatedFile = await fs.readFile('dir/.zshrc', 'utf8');
    expect(updatedFile).to.eq('echo\t\t\n');

    mock.restore();
  })

  it('Regex match will not match line with additional characters', async () => {
    mock.default({
      'dir': {
        '.zshrc': '# test-string-here $$\necho\t\t\n',
      },
    });

    await FileUtils.removeLineFromFile('dir/.zshrc', /test-string-here \$\$/)

    const updatedFile = await fs.readFile('dir/.zshrc', 'utf8');
    expect(updatedFile).to.eq('# test-string-here $$\necho\t\t\n');

    mock.restore();
  })

  it('Regex match will match line with additional spaces', async () => {
    mock.default({
      'dir': {
        '.zshrc': '\t\t   test-string-here $$\t\t\t     \necho\t\t\n',
      },
    });

    await FileUtils.removeLineFromFile('dir/.zshrc', /test-string-here \$\$/)

    const updatedFile = await fs.readFile('dir/.zshrc', 'utf8');
    expect(updatedFile).to.eq('echo\t\t\n');

    mock.restore();
  })

  it('FileUtils.appendToFileWithSpacing', () => {
    const testFile =
`# This is a test file
source abc...`

    expect(FileUtils.appendToFileWithSpacing(testFile, 'testText ... something;')).to.eq(
`# This is a test file
source abc...

testText ... something;`
    )

    const testFile2 =
      `# This is a test file
source abc...
`
    expect(FileUtils.appendToFileWithSpacing(testFile2, 'testText ... something;')).to.eq(
      `# This is a test file
source abc...

testText ... something;`
    )

    const testFile3 =
      `# This is a test file
source abc...

`
    expect(FileUtils.appendToFileWithSpacing(testFile3, 'testText ... something;')).to.eq(
      `# This is a test file
source abc...

testText ... something;`)

    const testFile4 =
      `
`
    expect(FileUtils.appendToFileWithSpacing(testFile4, 'testText ... something;')).to.eq(
      `testText ... something;`
    )

    const testFile5 = ''

    expect(FileUtils.appendToFileWithSpacing(testFile4, 'testText ... something;')).to.eq(
      `testText ... something;`
    )
  })

})
