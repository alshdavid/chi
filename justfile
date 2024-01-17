build:
  npx tsc --outDir ./dist/module --module NodeNext --moduleResolution NodeNext
  npx tsc --outDir ./dist/require --module CommonJS --moduleResolution Node
  npx tsc --outDir ./dist/types --module NodeNext --moduleResolution NodeNext --declaration true --emitDeclarationOnly true
