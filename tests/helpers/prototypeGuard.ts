type Snapshot = Map<string, PropertyDescriptor>;

// Built-ins that a prototype pollution attack could reach via `__proto__`,
// `constructor.prototype` or by mutating an inherited function such as
// `hasOwnProperty`
const getTargets = (): [string, any][] => {
	const objectProtoFunctions = Object.getOwnPropertyNames(Object.prototype)
		.filter((key) => key !== "__proto__" && typeof (Object.prototype as any)[key] === "function")
		.map((key): [string, any] => [`Object.prototype.${key}`, (Object.prototype as any)[key]]);

	return [
		["Object.prototype", Object.prototype],
		["Array.prototype", Array.prototype],
		["Function.prototype", Function.prototype],
		["Object", Object],
		["Array", Array],
		...objectProtoFunctions
	];
};

const snapshot = (target: any): Snapshot => {
	return new Map(Object.getOwnPropertyNames(target).map((key) => [key, Object.getOwnPropertyDescriptor(target, key) as PropertyDescriptor]));
};

const isSameDescriptor = (a: PropertyDescriptor, b: PropertyDescriptor): boolean => {
	return a.value === b.value && a.get === b.get && a.set === b.set && a.writable === b.writable && a.enumerable === b.enumerable;
};

/**
 * Captures the current state of the built-in prototypes so tests can
 * assert that nothing was added, changed or removed.
 */
export const createPrototypeGuard = () => {
	const targets = getTargets();
	const baseline = new Map(targets.map(([name, target]) => [name, snapshot(target)]));

	return {
		/**
		 * Returns a description of every change made to the built-ins since
		 * the guard was created and reverts those changes, so one failing
		 * test cannot leak pollution into the rest of the suite.
		 */
		collectAndRestore (): string[] {
			const changes: string[] = [];

			targets.forEach(([name, target]) => {
				const original = baseline.get(name) as Snapshot;
				const current = snapshot(target);

				current.forEach((descriptor, key) => {
					const originalDescriptor = original.get(key);

					if (!originalDescriptor) {
						changes.push(`added ${name}.${key}`);
						delete target[key];
						return;
					}

					if (!isSameDescriptor(descriptor, originalDescriptor)) {
						changes.push(`modified ${name}.${key}`);
						Object.defineProperty(target, key, originalDescriptor);
					}
				});

				original.forEach((descriptor, key) => {
					if (current.has(key)) return;

					changes.push(`removed ${name}.${key}`);
					Object.defineProperty(target, key, descriptor);
				});
			});

			return changes;
		}
	};
};
