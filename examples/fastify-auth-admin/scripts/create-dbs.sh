#!/bin/bash

read -r -d '' dbs << EOF
auth
EOF

for db in $dbs; do
    printf "Create database %-50s" "${db}"
    npx @uniform-foundation/cli exec database "psql -Upostgres -c \"create database ${db};\"" # &> /dev/null
    npx @uniform-foundation/cli exec database "psql -Upostgres -c \"create database ${db}_test;\"" # &> /dev/null
    echo "    [OK]"
done
