#!/bin/bash
set -e
coverage=$1
gha=$2

echo "run go vet ..."
go vet ./pkg/...
echo "... done"

if [ "$coverage" != "true" ]
then
  echo "run go tests ..."
  go test ./pkg/...
  echo "... done"
else
  echo "run go coverage tests ..."
  go test ./pkg/... -coverprofile=runtime/logs/test-coverage.out
  echo "... done"
fi