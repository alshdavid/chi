build:
  test -d node_modules || pnpm install
  rm -rf dist

  echo '{ "type": "module" }' > ./src/package.json
  npx tsc --outDir ./dist/module --module NodeNext --moduleResolution NodeNext
  mv ./src/package.json ./dist/module/package.json

  echo '{ "type": "commmonjs" }' > ./src/package.json
  npx tsc --outDir ./dist/require --module CommonJS --moduleResolution Node
  mv ./src/package.json ./dist/require/package.json
  
  npx tsc --outDir ./dist/types --module NodeNext --moduleResolution NodeNext --declaration true --emitDeclarationOnly true
