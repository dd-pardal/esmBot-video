/**
 * Class that handles situations where there is a limit on how many operations can be running at
 * the same time.
 */
export default class ConcurrencyLimiter {
    maxOngoingOperations;
    #ongoingOperations = 0;
    #queue = new Set();

    constructor(maxOngoingOperations) {
        this.maxOngoingOperations = maxOngoingOperations;
    }

    /**
     * Queues a callback to run. If the abort signal is fired before the callback is called, the
     * callback will be removed from the queue. Returns the promise returned by the callback.
     */
    runWhenFree(callback, abortSignal) {
        return new Promise((resolve) => {
            const runNow = () => {
                const promise = callback();
                resolve(promise);
                const onSettled = () => {
                    // After the operation ends, check for more
                    if (this.#queue.size > 0) {
                        const wrappedCallback = this.#queue.values().next().value;
                        this.#queue.delete(wrappedCallback);
                        wrappedCallback();
                    } else {
                        this.#ongoingOperations--;
                    }
                };
                promise.then(onSettled, onSettled);
            };

            if (this.#ongoingOperations < this.maxOngoingOperations) {
                // Start the operation right away
                this.#ongoingOperations++;
                runNow();
            } else {
                // Queue the operation
                if (abortSignal == undefined) {
                    this.#queue.add(runNow);
                } else {
                    const handler = () => {
                        this.#queue.delete(runNowAndRemoveListener);
                    };
                    const runNowAndRemoveListener = () => {
                        runNow();
                        abortSignal.removeEventListener("abort", handler);
                    };
                    abortSignal.addEventListener("abort", handler, { once: true });
                    this.#queue.add(runNowAndRemoveListener);
                }
            }
        });
    }
}
