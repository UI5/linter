import test from "ava";
import {Semaphore, SemaphoreGuard} from "../../../src/utils/Semaphore.js";

test("Semaphore should assign leases correctly", async (t) => {
	const semaphore = new Semaphore(5);
	const leases = [];
	for (let i = 0; i < 5; i++) {
		leases[i] = await semaphore.acquireLease();
	}
	t.true(leases.length === 5, `Expected Semaphore leases to be 5, got ${leases.length} instead`);
	const limitEnforced = await Promise.race([semaphore.acquireLease(), Promise.resolve(true)]);
	t.true(limitEnforced === true, "Expected Semaphore to prevent lease grant when limit was reached");
});

test("SemaphoreGuard should drop when it goes out of scope", (t) => {
	let released = false;
	const releaseFn = () => {
		released = true;
	};
	const guard = new SemaphoreGuard(releaseFn, 0);
	{
		using _ = guard;
	}
	t.true(released, "SemaphoreGuard should have been released but wasn't");
});

test("Semaphore should wait until a lease is dropped before granting a new one", async (t) => {
	const semaphore = new Semaphore(1);
	const lease = await semaphore.acquireLease();
	let leaseGrantedAfterDrop = false;

	void (async () => {
		const _ = await semaphore.acquireLease();
		leaseGrantedAfterDrop = true;
	})();
	void await new Promise((resolve) => setImmediate(resolve));
	t.false(leaseGrantedAfterDrop, "Semaphore granted a lease when it should not have");
	{
		using _ = lease;
	}
	void await new Promise((resolve) => setImmediate(resolve));
	t.true(leaseGrantedAfterDrop, "Semaphore did not grant a lease but should have");
});
