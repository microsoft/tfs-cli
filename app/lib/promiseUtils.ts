export function timeout<T>(promise: PromiseLike<T>, timeoutMs: number, message?: string) {
	return new Promise<T>((resolve, reject) => {
		const timeoutHandle = setTimeout(() => {
			reject(message == null ? `Timed out after ${timeoutMs} ms.` : message);
		}, timeoutMs);

		// Maybe use finally when it's available.
		promise.then(
			result => {
				resolve(result);
				clearTimeout(timeoutHandle);
			},
			reason => {
				reject(reason);
				clearTimeout(timeoutHandle);
			},
		);
	});
}

// This method is bad and you should feel bad for using it.
export interface Deferred<T> {
	resolve: (val: T) => void;
	reject: (reason: any) => void;
	promise: Promise<T>;
}

export function defer<T>(): Deferred<T> {
	let resolve: (val: T) => void;
	let reject: (val: any) => void;
	const promise = new Promise<T>((resolver, rejecter) => {
		resolve = resolver;
		reject = rejecter;
	});
	return {
		resolve,
		reject,
		promise,
	};
}

export async function wait(timeoutMs: number): Promise<void> {
	return new Promise<void>(resolve => {
		setTimeout(resolve, timeoutMs);
	});
}

// Return a promise that resolves at least delayMs from now. Rejection happens immediately.
export async function delay<T>(promise: Promise<T>, delayMs: number): Promise<T> {
	return (await Promise.all([promise, wait(delayMs)]))[0];
}

export interface PromiseResult<T = any> {
	state: "fulfilled" | "rejected";
	value?: T;
	reason?: any;
}

export function allSettled<T = any>(promises: PromiseLike<T>[]): Promise<PromiseResult<T>[]> {
	const results = new Array(promises.length);
	return new Promise(resolve => {
		let count = 0;
		for (let i = 0; i < promises.length; ++i) {
			const promise = promises[i];
			promise
				.then(
					result => {
						results[i] = {
							state: "fulfilled",
							value: result,
						};
					},
					reason => {
						results[i] = {
							state: "rejected",
							reason: reason,
						};
					},
				)
				.then(() => {
					if (++count === promises.length) {
						resolve(results);
					}
				});
		}
	});
}

export function realPromise<T>(promise: PromiseLike<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		promise.then(resolve, reject);
	});
}
