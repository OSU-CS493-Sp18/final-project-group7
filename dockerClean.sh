docker stop $(docker ps -q -a)
docker rm $(docker ps -q -a)
docker rmi $(docker images -q)
docker volume prune
docker network prune
