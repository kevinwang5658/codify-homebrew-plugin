import * as fs from 'node:fs/promises';

export class FileUtils {
  static async removeFromFile(searchString: string, filePath: string): Promise<void> {
    const zshEnvFile = await fs.readFile(filePath)
    const editedZshEnvFile = zshEnvFile.toString().replace(searchString, '')
    await fs.writeFile(filePath, editedZshEnvFile)
  }
}