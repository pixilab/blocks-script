define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resource = exports.max = exports.min = exports.list = exports.id = exports.spotParameter = exports.field = exports.parameter = exports.callable = exports.property = exports.roleRequired = exports.record = exports.driver = void 0;
    function driver(baseDriverType, typeSpecificMeta) {
        return $metaSupport$.driverInfo(baseDriverType, typeSpecificMeta);
    }
    exports.driver = driver;
    function record(description) {
        return $metaSupport$.record(description);
    }
    exports.record = record;
    function roleRequired(role) {
        return function (target) {
            return Reflect.defineMetadata("pixi:roleRequired", role, target);
        };
    }
    exports.roleRequired = roleRequired;
    function property(description, readOnly) {
        return $metaSupport$.property(description, readOnly);
    }
    exports.property = property;
    function callable(description) {
        return $metaSupport$.callable(description);
    }
    exports.callable = callable;
    function parameter(description, optional) {
        return $metaSupport$.callableParameter({
            descr: description || "",
            opt: optional || false
        });
    }
    exports.parameter = parameter;
    function field(description) {
        return $metaSupport$.fieldMetadata({ description: description });
    }
    exports.field = field;
    function spotParameter() {
        return $metaSupport$.spotParameter();
    }
    exports.spotParameter = spotParameter;
    function id(description) {
        return $metaSupport$.fieldMetadata({ description: description, id: true });
    }
    exports.id = id;
    function list(ofType, description) {
        return $metaSupport$.fieldMetadata({ description: description, list: ofType });
    }
    exports.list = list;
    function min(min) {
        return function (target, propertyKey) {
            Reflect.defineMetadata("pixi:min", min, target, propertyKey);
        };
    }
    exports.min = min;
    function max(max) {
        return function (target, propertyKey) {
            Reflect.defineMetadata("pixi:max", max, target, propertyKey);
        };
    }
    exports.max = max;
    function resource(roleRequired, verb) {
        return function (target, propertyKey) {
            var info = {
                auth: roleRequired || '',
                verb: verb || 'POST'
            };
            return Reflect.defineMetadata("pixi:resource", info, target, propertyKey);
        };
    }
    exports.resource = resource;
});
