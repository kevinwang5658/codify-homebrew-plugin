import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    onConsoleLog: (log) => {
      console.log(log);
    },
    watch: false,
  },
})