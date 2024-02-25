import os from 'node:os';

const homeDirectory = os.homedir();

export function untildify(pathWithTilde: string) {
  return homeDirectory ? pathWithTilde.replace(/^~(?=$|\/|\\)/, homeDirectory) : pathWithTilde;
}