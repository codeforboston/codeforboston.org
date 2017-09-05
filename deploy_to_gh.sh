#!/bin/sh
jekyll build
git subtree push --prefix _site origin gh-pages
