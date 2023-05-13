echo "current directory" $PWD

set -e

cd ..
sh build_release.sh

cd deployment

npx ts-node scripts/init_dex.ts 
npx ts-node scripts/set_route_decimals.ts
