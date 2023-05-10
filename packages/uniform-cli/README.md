# UniformCLI 

Universal CLI interface to work with Uniform framework, projects and tools

Currently supports:
1) Docker compose automation
2) Multi-project setup

Minimal uniform.json example:
```json
{
    "name": "example",
    "version": "1.0.0",
    "variables": {
        "APPS_ROOT": "${WORKSPACE_PATH}/apps",
        "PACKAGES_ROOT": "${WORKSPACE_PATH}/packages",
        "NETWORK": "example",
        "BASE_DOMAIN": "${NETWORK}.127.0.0.1.nip.io",
        "GROUP_ID": "1001",
        "USER_ID": "1001",
        "HOME_PATH": "${WORKSPACE_PATH}/.uniform"
    },
    "components": {
        "nodejs": {
            "isTemplate": true,
            "path": "${WORKSPACE_PATH}/templates/nodejs",
            "variables": {
                "APP_IMAGE": "nodejs:latest",
                "NGINX_IMAGE": "nginx:1.19-alpine",
                "BASE_IMAGE": "node:16.3.0-alpine"
            }
        },
        "proxy": {
            "path": "${WORKSPACE_PATH}/services/proxy",
            "variables": {
                "APP_IMAGE": "jwilder/nginx-proxy:latest"
            },
            "tags": [
                "system"
            ]
        },
        "database": {
            "path": "${WORKSPACE_PATH}/services/database",
            "variables": {
                "APP_IMAGE": "postgis/postgis:13-3.1"
            },
            "tags": [
                "system"
            ]
        },
        "admin-gui-backend": {
            "extends": "nodejs",
            "path": "${APPS_ROOT}/admin-gui/admin-gui-backend",
            "repository": "git@github.com:UniformFoundation/Uniform-gui-backend",
            "tags": [
                "code",
                "app",
                "backend"
            ],
            "dependencies": {
                "database": [
                    "default",
                    "hook"
                ],
                "proxy": [
                    "default"
                ]
            }
        }
    },
    "packages": {
        "auth-client": {
            "path": "${PACKAGES_ROOT}/auth-client",
            "tags": [
                "code",
                "lib"
            ]
        }
    }
}
```