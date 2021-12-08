#!/bin/bash

SLACK_URL="$1"
NEWSLETTER_SEND_DATE="$2"
NEWSLETTER_URL="$3"

curl -X POST \
     -H 'Content-type: application/json' \
     -d '{ "text": "SendGrid single send created for newsletter", "blocks": [{ "type": "section", "text": { "type": "mrkdwn", "text": "Newsletter: <'"$NEWSLETTER_URL"'|Single Send> created." } }] }' \
     "$SLACK_URL"
