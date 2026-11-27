#! /bin/bash

set -euo pipefail

docker save ghcr.io/dinno7/distributed-ecommerce:latest >des.gz

rsync -vazpP ./des.gz mine:/opt/snapshop
