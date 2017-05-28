#!/bin/bash
set -e #exit at every exit code different from "0"

export VERSION=$(cat package.json|grep version|sed s/\"version\"\:\ \"//g|sed s/\"\,//g|sed s/\ //g)
echo $VERSION > ./version.txt
mkdir -p tfx-cli
cp -r node_modules tfx-cli/
cp -r _build tfx-cli/
zip -r tfx-cli.zip ./tfx-cli/
rm -rf ./tfx-cli/
touch ./upload.log

# based on https://github.com/JFrogDev/project-examples/blob/master/bash-example/deploy-file.sh

usage () {
   ME=$(basename "$0")
   cat>&2<<EOF

Usage:
    $ME -g GROUP -a ARTIFACT -v VERSION -d BASEURL -f FILE -e EXT -u ARTIFACTORY_USER -p ARTIFACTORY_PASSWD
        Deploy a local file to Artifactory repository at \$BASEURL

        File will be deployed as:
        \$BASEURL/\$GROUP/\$ARTIFACT/\$VERSION/\${ARTIFACT}-\${VERSION}.\${EXT}

    $ME -h
        Print this message

EOF
}


fail_if() {
    # fail_if <command> <error_message>
    FAIL=false
    eval $1 && FAIL=true
    if $FAIL ; then
        echo "FAIL: $2">&2
        exit -1
    fi
}


while getopts ":g:a:d:f:e:u:p:h" opt; do
  case $opt in
    g)
        GROUP=$OPTARG;;
    a)
        ARTIFACT=$OPTARG;;
    d)
        BASEURL=$OPTARG;;
    f)
        FILE=$OPTARG;;
    e)
        EXT=$OPTARG;;
    u)
        ARTIFACTORY_USER=$OPTARG;;
    p)
        ARTIFACTORY_PASSWD=$OPTARG;;
    h)
        usage
        exit 0;;
    \?)
        fail_if "true" "Invalid option: -$OPTARG"
        ;;
    :)
        fail_if "true" "Option -$OPTARG requires an argument"
        ;;
  esac
done

fail_if '[[ -z "$GROUP" ]]' 'missing GROUP'
fail_if '[[ -z "$ARTIFACT" ]]' 'missing ARTIFACT'
fail_if '[[ -z "$VERSION" ]]' 'missing VERSION'
fail_if '[[ -z "$BASEURL" ]]' 'missing BASEURL'
fail_if '[[ -z "$FILE" ]]' 'missing FILE'
fail_if '[[ -z "$EXT" ]]' 'missing EXT'
fail_if '[[ -z "$ARTIFACTORY_USER" ]]' 'missing ARTIFACTORY_USER'
fail_if '[[ -z "$ARTIFACTORY_PASSWD" ]]' 'missing ARTIFACTORY_PASSWD'


md5Value="`md5sum "$FILE"`"
md5Value="${md5Value:0:32}"
sha1Value="`sha1sum "$FILE"`"
sha1Value="${sha1Value:0:40}"

uploadUrl="$BASEURL/${GROUP//[.]//}/$ARTIFACT/"$VERSION"/${ARTIFACT}-${VERSION}.${EXT}"

printf "File: %s\nVersion: %s\nMD5: %s\nSHA1: %s\nUpload URL: %s\n" "$FILE" "$VERSION" "$md5Value" "$sha1Value" "$uploadUrl"

STATUSCODE=$(curl --progress-bar -i -X PUT -u $ARTIFACTORY_USER:$ARTIFACTORY_PASSWD \
 -H "X-Checksum-Md5: $md5Value" \
 -H "X-Checksum-Sha1: $sha1Value" \
 -T "$FILE" \
 --output ./upload.log --write-out "%{http_code}" \
 "$uploadUrl"||:)
## comment test
fail_if '[[ "$STATUSCODE" -ne "201" ]]' "Upload failed: http status $STATUSCODE"

echo "Upload successfull!"
# generic comment to check CI