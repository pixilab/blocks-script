/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    function driver(baseDriverType, typeSpecificMeta) {
        var info = {
            paramTypes: [baseDriverType],
            info: typeSpecificMeta
        };
        return function (target) {
            return Reflect.defineMetadata("pixi:driver", info, target);
        };
    }
    exports.driver = driver;
    /**
     Annotation defining a property, for use on set or get pseudo-method defining the property.
     In addition to adding "pixi:property" metadata to the property, it also hooks up change
     notofication qualified by the name of the property when its value changes through the
     "set" pseudo-method. If there are pixi:min or pixi:max constraints applied to the
     property, I will clip any value set to these extremes.
     */
    function property(description, readOnly) {
        return function (target, propName, prop) {
            var origSetter = prop.set;
            var constrMin; // Constraint value(s), if any
            var constrMax;
            var constr; // Set once any constraints have been obtained
            if (origSetter) {
                prop.set = function (newValue) {
                    var oldValue = prop.get.call(this);
                    if (typeof newValue === 'number') {
                        if (!constr) {
                            constrMin = Reflect.getMetadata("pixi:min", target, propName);
                            constrMax = Reflect.getMetadata("pixi:max", target, propName);
                            constr = true; // Now loaded
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
            Reflect.defineMetadata('pixi:property', description || "", target, propName);
            if (readOnly)
                Reflect.defineMetadata('pixi:readOnly', true, target, propName);
            return prop;
        };
    }
    exports.property = property;
    /**
     Annotation declaring a callable method, with optional description.
     */
    function callable(description) {
        return function (target, propertyKey, descriptor) {
            var func = target[propertyKey];
            var info = {
                descr: description || "",
                args: getArgs(func)
            };
            return Reflect.defineMetadata("pixi:callable", info, target, propertyKey);
        };
    }
    exports.callable = callable;
    /**
     Function parameter annotation, providing a textual description of the parameter.
     */
    function parameter(description) {
        return function (clsFunc, propertyKey, paramIndex) {
            propertyKey = propertyKey + ':' + paramIndex;
            return Reflect.defineMetadata("pixi:param", description || "", clsFunc, propertyKey);
        };
    }
    exports.parameter = parameter;
    /**
     Annotation defining a numeric value constraint, mainly for use on numeric properties (although
     it could conceivably also be used on strings to define a min/max length, or similar).
     */
    function min(min) {
        return function (target, propertyKey, descriptor) {
            Reflect.defineMetadata("pixi:min", min, target, propertyKey);
        };
    }
    exports.min = min;
    function max(max) {
        return function (target, propertyKey, descriptor) {
            Reflect.defineMetadata("pixi:max", max, target, propertyKey);
        };
    }
    exports.max = max;
    /*	Get the formal parameter names of func as an array.
     */
    function getArgs(func) {
        // First match everything inside the function argument parens.
        var args = func.toString().match(funcArgsRegEx)[1];
        // Split the arguments string into an array comma delimited.
        return args.split(',')
            .map(function (arg) {
            return arg.replace(parNameRegEx, '').trim();
        }).filter(function (arg) {
            return arg;
        });
    }
    // Regexes used by getArgs above
    var funcArgsRegEx = /function\s.*?\(([^)]*)\)/;
    var parNameRegEx = /\/\*.*\*\//;
});
