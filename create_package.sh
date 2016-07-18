#!/bin/bash
export version=$(cat package.json|grep version|sed s/\"version\"\:\ \"//g|sed s/\"\,//g|sed s/\ //g)
echo $version > ./version.txt
mkdir -p tfx-cli
cp -r node_modules tfx-cli/
cp -r _build tfx-cli/
zip -r tfx-cli-$version.zip ./tfx-cli/
rm -rf ./tfx-cli/
