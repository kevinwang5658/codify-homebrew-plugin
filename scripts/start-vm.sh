#!/bin/bash

tart run codify-sonoma --dir . --no-graphics &

sleep 2

echo "Started tart vm"
tart ip $(tart list -q | head -1)

# keep this script running indefinitely
tail -f /dev/null

# Kill the vm (child process) when this script ends
trap "tart stop codify-sonoma" EXIT