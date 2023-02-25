#!/bin/bash

read -r -d '' dbs << EOF
auth
EOF

for db in $dbs; do
    printf "Create database %-50s" "${db}"
    npx uniform --svc=database psql -Upostgres -c "create database ${db};" &> /dev/null
    npx uniform --svc=database psql -Upostgres -c "create database ${db}_test;" &> /dev/null
    echo "    [OK]"
done
