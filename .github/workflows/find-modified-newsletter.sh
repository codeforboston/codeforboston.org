#!/bin/bash

post_path="$(git log --pretty=format: --name-only -1 --diff-filter=A \
                     | grep '^_posts/' \
                     | head -n1)"

if [ -n "$post_path" ]; then
    repo_root="$GITHUB_WORKSPACE"
    if [ -z "$repo_root" ]; then
        repo_root="$(git rev-parse --show-toplevel)"
    fi

    post_path="$repo_root/$post_path"
fi

echo "::set-output name=post_path::$post_path"
