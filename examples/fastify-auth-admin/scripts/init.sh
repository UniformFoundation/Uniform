#!/bin/bash

chmod -R 777 .uniform/cache

mkdir -p services/database/data
mkdir -p services/kafka/data
mkdir -p services/es/data
mkdir -p services/es/cache

mkdir -p services/es/data/public
mkdir -p services/es/data/protected

chmod -R 777 services/database/data
chmod -R 777 services/es/data
chmod -R 777 services/kafka/data