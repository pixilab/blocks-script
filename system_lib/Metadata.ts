/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */


declare global {
	var $metaSupport$: {
		property(description ?: string, readOnly ?: boolean): any;
		callable(description ?: string): any;
		fieldMetadata(metadataValue: any): {
			(target: Function): void;
			(target: Object, targetKey: string | symbol): void;
		};
	}
}

/**
 Decorator defining a class acting as a device driver. This class must have a constructor
 that takes the baseDriverType of low-level driver to attach to. The driverMeta passed in
 is an object with keys/values that vary with the type of driver attached (see
 NetworkTCPDriverMetaData and NetworkUDPDriverMetaData in Network.ts for those driver
 types).

 Note to self: I must pass in baseDriverType as a string, since those are typically
 defined as interfaces (they're implemented in Java), so I can't get the param type
 using design:paramtypes, as that will just say 'Object' for an interface.
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
 * Annotation for user script class, specifying role required to set properties exposed
 * by script, where role is one of the following: "Admin", "Manager", "Creator", "Editor",
 * "Contributor", "Staff" or "Spot".
 */
export function roleRequired(role: string) {
	return function(target: any): void {
		return Reflect.defineMetadata("pixi:roleRequired", role, target);
	}
}

/**
 Decorator declaring a property, for use on set or get function exposing
 the property's value.
 */
export function property(description?: string, readOnly?: boolean) {
	return $metaSupport$.property(description, readOnly); // Impl moved into $core
}

/**
 Decorator declaring a Task-callable method on a driver or user script,
 with optional description.
 */
export function callable(description?: string) {
	return $metaSupport$.callable(description); // Impl moved into $core
}

/**
 Optional function parameter decorator, providing a textual description of the parameter.
 Also allows trailing parameters to be marked as optional (typically used with
 '?' after the param name in the param list to also inform the compiler).
 */
export function parameter(description?: string, optional?: boolean) {
	return function(clsFunc: Object, propertyKey: string, paramIndex: number) {
		propertyKey = propertyKey + ':' + paramIndex;
		var data = {
			descr: description || "",
			opt: optional || false
		};
		// Note that "data" here used to be JUST the description string in Blocks < 1.1b16
		return Reflect.defineMetadata("pixi:param", data, clsFunc, propertyKey);
	}
}

interface Ctor<T> { new(... args: any[]): T ;}

/**
 * Decorator for a feed item data field. Applied to an instance variable.
 * Field value is read-only by definition.
 */
export function field(description?: string) {
	return $metaSupport$.fieldMetadata({description: description} );
}

/**
 * Decorator for (presumably unique) Feed item ID field, if any. Applied to an
 * instance variable typically of string or number type. Read-only by definition.
 */
export function id(description?: string) {
	return $metaSupport$.fieldMetadata( {description: description, id: true} );
}

/**
 * Decorator specifying a list of feed item child elements of type T.
 * Apply to an instance variable of array type.
 */
export function list<T extends Object>(ofType: Ctor<T>, description?: string) {
	return $metaSupport$.fieldMetadata({description: description, list: ofType} );
}

/**
 Decorator defining a numeric value constraint, mainly for use on numeric properties and fields (although
 it could conceivably also be used on strings to define a min/max length, or similar).
 */
export function min(min:number) {
    return function (target: any, propertyKey: string) {
		Reflect.defineMetadata("pixi:min", min, target, propertyKey);
    };
}

export function max(max:number) {
    return function (target: any, propertyKey: string) {
		Reflect.defineMetadata("pixi:max", max, target, propertyKey);
    };
}

/**
 Decorate a method as accessible from a web client as a POST request under

 	/rest/script/invoke/<user-script-name>/<method-name>

 with a JSON body payload deserialized and passed to the method as an object.
 The method must be declared as accepting an object even if you don't need
 any data (i.e., pass null). An object or string returned from the method
 will be serialized as JSON data and returned to the web client. Alternatively,
 you may return a promise eventually resolving with the result value.

 The roleRequired parameter, if specified, limits who can call the resource from the
 outside, and accepts the same values as the roleRequired decorator.
 */
export function resource(roleRequired?: string) {
	return function(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
		const info = {	// Information provided about this resource
			auth: roleRequired || ""
		};
		return Reflect.defineMetadata("pixi:resource", info, target, propertyKey);
	}
}

