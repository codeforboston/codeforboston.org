#!/bin/bash

commit_date=$(git log --pretty=format:%ai -1)

echo "::set-output name=commit_date::$commit_date"
