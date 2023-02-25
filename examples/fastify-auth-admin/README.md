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

To start the microservices, run:

`npm i -g @uniform/cli`
`uniform`