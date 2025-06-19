import { ConflictError, BadRequestError, NotFoundError } from "../errors/errors.js";

const errorHandler = (error, req, res, next) => {
    if (error instanceof ConflictError || error instanceof BadRequestError || error instanceof NotFoundError) {
        console.log(error);
        return res.status(error.statusCode).json({ error: error.message });
    }

    if (error.status === 429) {
        return res.status(429).json({
            error: error.message || 'Too many requests, please try again later.',
        });
    }
    console.log(error);
    return res.status(500).json({ error: 'Internal Server Error' });
};

export default errorHandler;