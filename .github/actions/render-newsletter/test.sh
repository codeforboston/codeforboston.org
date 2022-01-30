#!/bin/bash

if [ -z "$INPUT_AFTER_DATE" ]; then
    export INPUT_AFTER_DATE=$(git log --pretty=format:%ai -1)
fi

if [ -z "$INPUT_SENDGRID_API_KEY" ]; then
    export INPUT_SENDGRID_API_KEY=$(security find-generic-password -s 'newsletter-api-key' -a 'sendgrid-cfb' -w)
fi

if [ -z "$INPUT_SLACK_URL" ]; then
    hackoncfb_slack_url=$(security find-generic-password -s 'slack-webhook' -a 'cfb-hackoncfb' -w)
    beacontest2_slack_url=$(security find-generic-password -s 'slack-webhook' -a 'cfb-beacontest2' -w)
    export INPUT_SLACK_URL="$hackoncfb_slack_url"
    # export INPUT_SLACK_URL="$beacontest2_slack_url"
fi

NODE_ENV=test ts-node ./src/index.ts
