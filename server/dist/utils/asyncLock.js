"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auctionBidLock = exports.AsyncKeyedLock = void 0;
/**
 * In-memory Per-Key Mutex Lock
 * Guarantees strict linearizability of concurrent actions on the same entity (e.g. auction_id)
 * while allowing independent entities to execute concurrently.
 */
class AsyncKeyedLock {
    lockQueues = new Map();
    /**
     * Executes the given task under a mutual exclusion lock for the specified key.
     * Ensures zero race conditions between concurrent calls on the same key.
     */
    async acquire(key, task) {
        const previousPromise = this.lockQueues.get(key) || Promise.resolve();
        let releaseLock;
        const currentPromise = new Promise((resolve) => {
            releaseLock = resolve;
        });
        // Chain the current lock behind the previous one
        this.lockQueues.set(key, previousPromise.then(() => currentPromise));
        try {
            // Wait for any previous task on this key to finish
            await previousPromise;
            return await task();
        }
        finally {
            // Always release lock for the next task in queue
            releaseLock();
            // Clean up map entry if this was the last pending task
            if (this.lockQueues.get(key) === currentPromise) {
                this.lockQueues.delete(key);
            }
        }
    }
    /**
     * Number of currently locked keys (useful for metrics)
     */
    getActiveLockCount() {
        return this.lockQueues.size;
    }
}
exports.AsyncKeyedLock = AsyncKeyedLock;
exports.auctionBidLock = new AsyncKeyedLock();
