
all:
	docker-compose up --build

stop: down

down:
	docker-compose down -v

#todo: when we start using volumes, create clean with which weird if fi search blocks to delete the memory on clean?

.PHONY: build up down all