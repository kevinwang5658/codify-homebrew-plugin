import { beforeAll, afterAll } from 'vitest';
import { TestUtils } from 'codify-plugin-test';
import fs from 'node:fs';
import path from 'node:path';

let startupRcFile: string;

const pluginPath = path.resolve('./src/index.ts');

beforeAll(async () => {
  startupRcFile = fs.readFileSync(TestUtils.getPrimaryShellRc(), 'utf8');
  await TestUtils.ensureHomebrewInstalled(pluginPath)
}, 300000)

afterAll(() => {
  fs.writeFileSync(TestUtils.getPrimaryShellRc(), startupRcFile);
})
