#!/bin/bash

for test in ./test/**/*.test.ts; do
  echo "Running: ${test}"
  # Switch to -o for debugging. This will provide all of the logs from the VM.
  cirrus run --dirty integration_individual_test -e FILE_NAME="${test}" # -o simple
done
