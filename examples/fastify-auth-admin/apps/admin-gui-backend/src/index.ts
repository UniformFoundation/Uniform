import { getEnvironment } from '@scripts/env';

import createServer from './createServer';

const { APP_PORT } = getEnvironment();

createServer()
    .then(app => {
        process.on('SIGINT', () => {
            app.close().catch(console.error);
        });

        process.on('SIGTERM', () => {
            app.close().catch(console.error);
        });

        app.listen({ port: APP_PORT, host: '0.0.0.0' }, err => {
            if (err) {
                app.log.error(err);
            }
        });
    })
    .catch(console.error);
