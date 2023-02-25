export class HttpError extends Error {
    code: number;

    constructor(code: number, message: string, cause?: unknown) {
        super(
            message,
            cause
                ? {
                      cause,
                  }
                : undefined
        );

        this.code = code;
    }
}
