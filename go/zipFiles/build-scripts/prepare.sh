#!/bin/bash

set -e

mode=$1
if [ -z "$mode" ]
then
  mode="all"
fi

if [ "$mode" = "all" ] || [ "$mode" = "dep" ] || [ "$mode" = "dependencies" ]
then
  echo "run go mod vendor/tidy/verify ..."
  go mod tidy
  go mod verify
  echo "... done"
else
  echo "skipping dependency cleanup & verification"
fi

if [ "$mode" = "all" ] || [ "$mode" = "gen" ] || [ "$mode" = "generate" ]
then
  echo "format code ..."
  go fmt ./pkg/...
  echo "... done"
else
  echo "skipping code generation"
fi

sh ./build-scripts/test-all.sh