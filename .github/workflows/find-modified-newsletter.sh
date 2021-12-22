#!/bin/bash

# Find the latest commit that doesn't change the actions or workflows
commit_hash=$(git log --pretty=format:%H -1 -- ':/!.github/*')

# Find new posts in the latest commit, if any
post_path="$(git show --pretty=format: --name-only --diff-filter=A $commit_hash \
                     | grep '^_posts/' \
                     | head -n1)"

if [ -n "$post_path" ]; then
    repo_root="$GITHUB_WORKSPACE"
    if [ -z "$repo_root" ]; then
        repo_root="$(git rev-parse --show-toplevel)"
    fi

    post_path="$repo_root/$post_path"

    echo Found post: $post_path
fi

echo "::set-output name=post_path::$post_path"
