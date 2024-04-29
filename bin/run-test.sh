sshpass -p admin ssh admin@$(tart ip $(tart list -q | head -1)) << 'ENDSSH'
  cd /Volumes/My\ Shared\ Files/working-dir/
ENDSSH
