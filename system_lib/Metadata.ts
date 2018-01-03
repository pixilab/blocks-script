/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/**
 Annotation defining a class acting as a device driver. This class must have a constructor
 that takes the baseDriverType of low-level driver to attach to. The driverMeta passed in
 is an object with keys and values as dictated by the type of driver attached to. E.g., for
 a NetworkTCP driver, this may specify the port number to use. See documentation for each
 low level-driver type for more information.

 Note to self: I must pass in baseDriverType as a string, since those are typically
 defined as interfaces (they're implemented in Java land), so I can't get the
 param type using design:paramtypes, as that will just say Object for an interface.
 */
export function driver(baseDriverType: string, typeSpecificMeta: any) {
	const info: DriverInfo = {
		paramTypes: [baseDriverType],
		info: typeSpecificMeta
	};
	return function(target: any): void {
		return Reflect.defineMetadata("pixi:driver", info, target);
	}
}

/**
 What I attach to my pixi:driver metadata key.
 */
interface DriverInfo {
	info: any;
	paramTypes: string[];
}

/**
 Annotation defining a property, for use on set or get pseudo-method defining the property.
 In addition to adding "pixi:property" metadata to the property, it also hooks up change
 notofication qualified by the name of the property when its value changes through the
 "set" pseudo-method. If there are pixi:min or pixi:max constraints applied to the
 property, I will clip any value set to these extremes.
 */
export function property(description?: string, readOnly?: boolean) {

	return function(target: any, propName: string, prop: TypedPropertyDescriptor<any>) {
		const origSetter = prop.set;

		let constrMin: number;	// Constraint value(s), if any
		let constrMax: number;
		let constr: boolean;	// Set once any constraints have been obtained

		if (origSetter) {
			prop.set = function (newValue) {
				const oldValue = prop.get.call(this);
				if (typeof newValue === 'number') {	// Apply any constraints to numeric value
					if (!constr) {	// Constraints need to be obtained (only done 1st time)
						constrMin = Reflect.getMetadata("pixi:min", target, propName);
						constrMax = Reflect.getMetadata("pixi:max", target, propName);
						constr = true;	// Now loaded
					}
					if (constrMin !== undefined)
						newValue = Math.max(newValue, constrMin);
					if (constrMax !== undefined)
						newValue = Math.min(newValue, constrMax);
				}
				origSetter.call(this, newValue);
				newValue = prop.get.call(this);
				if (oldValue !== newValue)
					this.__scriptFacade.firePropChanged(propName);
			};
		}
		Reflect.defineMetadata('pixi:property', description, target, propName);
		if (readOnly) // Explicit read-only (may still have a setter for "internal" use)
			Reflect.defineMetadata('pixi:readOnly', true, target, propName);
		return prop;
	}
}

/**
 Annotation declaring a callable method, with optional description.
 */
export function callable(description?: string) {
	return function(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
		const func: Function = target[propertyKey];
		const info = {	// Information provided about this callable
			descr: description,
			args: getArgs(func)
		};
		return Reflect.defineMetadata("pixi:callable", info, target, propertyKey);
	}
}

/**
 Function parameter annotation, providing a textual description of the parameter.
 */
export function parameter(description?: string) {
	return function(clsFunc: Object, propertyKey: string, paramIndex: number) {
		propertyKey = propertyKey + ':' + paramIndex;
		return Reflect.defineMetadata("pixi:param", description, clsFunc, propertyKey);
	}
}

/**
 Annotation defining a numeric value constraint, mainly for use on numeric properties (although
 it could conceivably also be used on strings to define a min/max length, or similar).
 */
export function min(min:number) {
    return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
		Reflect.defineMetadata("pixi:min", min, target, propertyKey);
    };
}

export function max(max:number) {
    return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
		Reflect.defineMetadata("pixi:max", max, target, propertyKey);
    };
}

/*	Get the formal parameter names of func as an array.
 */
function getArgs(func: Function): string[] {
	// First match everything inside the function argument parens.
	const args = func.toString().match(funcArgsRegEx)[1];

	// Split the arguments string into an array comma delimited.
	return args.split(',')
	.map(arg => // Skip inline comments and trim whitespace
		arg.replace(parNameRegEx, '').trim()
	).filter(arg => 	// Ensure no undefined values are added
		arg
	);
}

// Regexes used by getArgs above
const funcArgsRegEx = /function\s.*?\(([^)]*)\)/;
const parNameRegEx = /\/\*.*\*\//;
