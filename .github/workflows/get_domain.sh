#!/bin/bash

repo_root="$GITHUB_WORKSPACE"
if [ -z "$repo_root" ]; then
    repo_root="$(git rev-parse --show-toplevel)"
fi

cname_file="${repo_root}/CNAME"

if [ -f "$cname_file" ]; then
    domain="$(cat $cname_file)"
else
    domain=$(basename "$repo_root")
fi

echo "::set-output name=domain::$domain"
