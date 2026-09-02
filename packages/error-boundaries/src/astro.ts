export type ErrorStatus = 400 | 401 | 403 | 404 | 500 | 502 | 503;

export type ErrorStatusCopy = {
	title: string;
	description: string;
};

export const ERROR_STATUS_COPY: Readonly<Record<ErrorStatus, ErrorStatusCopy>> = Object.freeze({
	400: { title: 'Bad Request', description: 'The server could not understand the request due to invalid syntax.' },
	401: { title: 'Unauthorized', description: 'You need to authenticate to access this resource.' },
	403: { title: 'Forbidden', description: 'You do not have permission to access this resource.' },
	404: { title: 'Not Found', description: 'The requested page or resource could not be found.' },
	500: { title: 'Internal Server Error', description: 'The server encountered an unexpected condition preventing it from fulfilling the request.' },
	502: { title: 'Bad Gateway', description: 'The server received an invalid response from an upstream server.' },
	503: { title: 'Service Unavailable', description: 'The server is currently unable to handle the request due to temporary overload or maintenance.' },
});

/** Resolves unknown status values to the safe internal-server-error response. */
export function errorStatusCopy(status: number): ErrorStatusCopy {
	return ERROR_STATUS_COPY[status as ErrorStatus] ?? { title: 'Unknown Error', description: 'Something went wrong.' };
}
