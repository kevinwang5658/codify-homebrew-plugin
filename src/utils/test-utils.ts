import { CodifyTestUtils } from 'codify-plugin-lib';
import { ApplyRequestData, MessageStatus, PlanResponseData, StringIndexedObject } from 'codify-schemas';
import { ChildProcess, fork } from 'node:child_process';
import path from 'node:path';

export class TestResourceIPC<R extends StringIndexedObject> {
  childProcess: ChildProcess

  constructor() {
    this.childProcess = fork(
      path.join(__dirname, '../../src/index.ts'),
      [],
      { execArgv: ['--import', 'tsx/esm'], },
    )
  }

  async plan(config: R): Promise<{ status: MessageStatus, data: PlanResponseData }> {
    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(this.childProcess, {
      cmd: 'plan',
      data: config,
    });

    return {
      status: result.status,
      data: result.data,
    }
  }

  async apply(data: ApplyRequestData): Promise<{ status: MessageStatus, data: string | null }> {
    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(this.childProcess, {
      cmd: 'apply',
      data,
    });

    return {
      status: result.status,
      data: result.data,
    }
  }

  kill() {
    this.childProcess.kill();
  }
}
