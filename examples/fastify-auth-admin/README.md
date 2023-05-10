# Uniform fastify-auth-admin

This project is an example of [Uniform](https://github.com/UniformFoundation/Uniform) microservice framework.

In this example, you will see apps:

1. Auth - a micro service made for authentication and authorization. Stores users, roles, verification data in its database.
2. Admin-gui-backend - a micro service made for proxying API requests from a possible front-end to all the micro services.

Packages:
1. auth-client - an auto-generated typescript client based on auth openapi schema.

Services:
1. database - a postgres database docker service
2. kafka - a kafka + zookeeper docker service
3. kafka-ui - a kafka ui docker service
4. proxy - an nginx proxy docker service
5. es - a content storage and access docker service

To init the microservices:

1. Install `uniform-cli` [from releases](https://github.com/UniformFoundation/Uniform/releases/tag/v1.0.0)
2. Add the project using `uniform-cli project add fastify-auth-admin C:/full/path/to/folder`
3. Run `sh scripts/init.sh`

To start the microservices, run:
1. `uniform-cli start database`
2. `sh scripts/create-dbs.sh`
3. `uniform-cli start auth admin-gui-backend`

To stop the microservices, run:
> `uniform-cli stop auth admin-gui-backend`

To get a list of statuses of the microservices, run:
> `uniform-cli ps`
