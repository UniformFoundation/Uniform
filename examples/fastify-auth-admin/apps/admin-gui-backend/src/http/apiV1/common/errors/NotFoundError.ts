import { HttpError } from './HttpError';

export class NotFoundError extends HttpError {
    constructor(cause: unknown) {
        super(404, 'The requested resource could not be found', cause);

        this.name = 'Error 404';
    }
}
