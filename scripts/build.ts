import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { Ajv } from 'ajv';
import { IpcMessage, IpcMessageSchema, MessageStatus, ResourceSchema } from 'codify-schemas';
import mergeJsonSchemas from 'merge-json-schemas';
import { ChildProcess, fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as url from 'node:url';

import { codifySpawn } from '../src/utils/codify-spawn.js';

const ajv = new Ajv({
  strict: true
});
const ipcMessageValidator = ajv.compile(IpcMessageSchema);

function sendMessageAndAwaitResponse(process: ChildProcess, message: IpcMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    process.on('message', (response: IpcMessage) => {
      if (!ipcMessageValidator(response)) {
        throw new Error(`Invalid message from plugin. ${JSON.stringify(message, null, 2)}`);
      }

      // Wait for the message response. Other messages such as sudoRequest may be sent before the response returns
      if (response.cmd === message.cmd + '_Response') {
        if (response.status === MessageStatus.SUCCESS) {
          resolve(response.data)
        } else {
          reject(new Error(String(response.data)))
        }
      }
    });

    // Send message last to ensure listeners are all registered
    process.send(message);
  });
}

await codifySpawn('rm -rf ./dist')
await codifySpawn('npm run rollup -- -f es');

const plugin = fork(
  './dist/index.js',
  [],
  {
    // Use default true to test plugins in secure mode (un-able to request sudo directly)
    detached: true,
    env: { ...process.env },
    execArgv: ['--import', 'tsx/esm'],
  },
)

const initializeResult = await sendMessageAndAwaitResponse(plugin, {
  cmd: 'initialize',
  data: {}
})

const { resourceDefinitions } = initializeResult;
const resourceTypes = resourceDefinitions.map((i) => i.type);

const schemasMap = new Map<string, JSONSchema>()
for (const type of resourceTypes) {
  const resourceInfo = await sendMessageAndAwaitResponse(plugin, {
    cmd: 'getResourceInfo',
    data: { type }
  })

  schemasMap.set(type, resourceInfo.schema);
}

const mergedSchemas = [...schemasMap.entries()].map(([type, schema]) => {
    // const resolvedSchema = await $RefParser.dereference(schema)
    const resourceSchema = JSON.parse(JSON.stringify(ResourceSchema));

    delete resourceSchema.$id;
    delete resourceSchema.$schema;
    resourceSchema.description = `Resource type: "${type}" | ${resourceSchema.title}`;
    delete resourceSchema.title;
    delete resourceSchema.properties.type;

    if (schema) {
      delete schema.$id;
      delete schema.$schema;
      delete schema.title;
    }

    return mergeJsonSchemas([schema ?? {}, resourceSchema, { properties: { type: { const: type, type: 'string' } } }]);
  });


await codifySpawn('rm -rf ./dist')
await codifySpawn('npm run rollup'); // re-run rollup without building for es

console.log('Generated JSON Schemas for all resources')

const distFolder = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'dist');
const schemaOutputPath = path.resolve(distFolder, 'schemas.json');
fs.writeFileSync(schemaOutputPath, JSON.stringify(mergedSchemas, null, 2));

console.log('Successfully wrote schema to ./dist/schemas.json')

// eslint-disable-next-line n/no-process-exit,unicorn/no-process-exit
process.exit(0)



