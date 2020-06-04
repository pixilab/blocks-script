define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resource = exports.max = exports.min = exports.parameter = exports.callable = exports.property = exports.roleRequired = exports.driver = void 0;
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
    function roleRequired(role) {
        return function (target) {
            return Reflect.defineMetadata("pixi:roleRequired", role, target);
        };
    }
    exports.roleRequired = roleRequired;
    function property(description, readOnly) {
        return function (target, propName, prop) {
            var origSetter = prop.set;
            var constrMin;
            var constrMax;
            var constr;
            if (!prop.enumerable && prop.configurable) {
                prop.enumerable = true;
                Object.defineProperty(target, propName, prop);
            }
            if (origSetter) {
                prop.set = function (newValue) {
                    var oldValue = prop.get.call(this);
                    if (typeof newValue === 'number') {
                        if (!constr) {
                            constrMin = Reflect.getMetadata("pixi:min", target, propName);
                            constrMax = Reflect.getMetadata("pixi:max", target, propName);
                            constr = true;
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
    function parameter(description, optional) {
        return function (clsFunc, propertyKey, paramIndex) {
            propertyKey = propertyKey + ':' + paramIndex;
            var data = {
                descr: description || "",
                opt: optional || false
            };
            return Reflect.defineMetadata("pixi:param", data, clsFunc, propertyKey);
        };
    }
    exports.parameter = parameter;
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
    function resource(roleRequired) {
        return function (target, propertyKey, descriptor) {
            var info = {
                auth: roleRequired || ""
            };
            return Reflect.defineMetadata("pixi:resource", info, target, propertyKey);
        };
    }
    exports.resource = resource;
    function getArgs(func) {
        var args = func.toString().match(funcArgsRegEx)[1];
        return args.split(',')
            .map(function (arg) {
            return arg.replace(parNameRegEx, '').trim();
        }).filter(function (arg) {
            return arg;
        });
    }
    var funcArgsRegEx = /function\s.*?\(([^)]*)\)/;
    var parNameRegEx = /\/\*.*\*\//;
});
