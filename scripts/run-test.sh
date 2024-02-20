tart run --no-graphics --dir=project:~/projects/codify2 sonoma-base &
sshpass -p admin ssh admin@192.168.64.3 << 'ENDSSH'

cd /Volumes/My\ Shared\ Files/
cd project/homebrew-plugin/

npm run test:integration

ENDSSH

tart stop sonoma-base
