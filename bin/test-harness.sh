#!/bin/bash

echo $TART_HOME
trap 'kill $$; exit' INT

if [ ! -z "$1" ]; then
  echo "Test Path Supplied: $1"
  cirrus run --lazy-pull integration_individual_test -e FILE_NAME="$1" -o simple
  exit 0
fi

for test in ./test/**/*.test.ts; do
  echo "Running: ${test}"
  # Switch to -o for debugging. This will provide all of the logs from the VM.
  cirrus run --lazy-pull integration_individual_test -e FILE_NAME="${test}" # -o simple
done
