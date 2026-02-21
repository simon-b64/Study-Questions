#!/bin/sh
set -e

cat <<EOF > /usr/share/nginx/html/config.json
{
  "firebase": {
    "apiKey": "${FIREBASE_API_KEY}",
    "authDomain": "${FIREBASE_AUTH_DOMAIN}",
    "projectId": "${FIREBASE_PROJECT_ID}",
    "storageBucket": "${FIREBASE_STORAGE_BUCKET}",
    "messagingSenderId": "${FIREBASE_MESSAGING_SENDER_ID}",
    "appId": "${FIREBASE_APP_ID}",
    "recaptchaSiteKey": "${FIREBASE_RECAPTCHA_SITE_KEY}"
  }
}
EOF

exec nginx -g "daemon off;"

