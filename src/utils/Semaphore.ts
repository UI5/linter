import assert from "node:assert";

/**
 * Semaphore to limit concurrency, resource access or to rate limit
 * using a RAII-style acquire lock with automatic disposal when
 * the lock goes out of scope.
 */
export class Semaphore {
	#size: number;
	#leases = new Map<number, Promise<SemaphoreGuard>>();
	#rollingCt = 0;

	public constructor(size: number) {
		assert(size > 0, "Semaphore size must be greater than zero");
		this.#size = size;
	}

	/**
	 * Acquires the next available lease.
	 * If no leases are available, this function awaits
	 * until an existing lease is released.
	 * @returns Promise<SemaphoreGuard>
	 */
	public async acquireLease(): Promise<SemaphoreGuard> {
		// Wait for a lease to become available.
		// The loop is intentional since this.#leases.size
		// must be checked continuously to prevent over-granting
		// when multiple callers are waiting simultaneously.
		while (this.#leases.size >= this.#size) {
			const guard = await Promise.any(this.#leases.values());
			this.#leases.delete(guard.key);
		}
		this.#rollingCt++;
		const {resolve, promise} = Promise.withResolvers();
		const guard = new SemaphoreGuard(resolve, this.#rollingCt);
		this.#leases.set(this.#rollingCt, promise as Promise<SemaphoreGuard>);

		return guard;
	}
}

/**
 * Simple Guard with out of scope disposal.
 * Returned when a lease is successfully acquired
 * by the Semaphore.
 */
export class SemaphoreGuard {
	#release: (val: SemaphoreGuard) => void;
	public key: number;
	public constructor(release: (val: SemaphoreGuard) => void, key: number) {
		this.#release = release;
		this.key = key;
	}

	public [Symbol.dispose]() {
		this.#release(this);
	}
}
