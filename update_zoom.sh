#!/bin/sh
# update _rooms/cfb.md with new url from first argument
sed -i.tmp -e "s/redirect_to.*/redirect_to: $1/g" _rooms/cfb.md
# update ./_config.yml
sed -i.tmp -e "s/zoom_url:.*/zoom_url: $1/g" _config.yml

git add .
git commit -m 'Update Zoom Url'
git push origin master
