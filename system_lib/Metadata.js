"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driver = driver;
exports.record = record;
exports.roleRequired = roleRequired;
exports.property = property;
exports.enumerated = enumerated;
exports.callable = callable;
exports.parameter = parameter;
exports.field = field;
exports.spotParameter = spotParameter;
exports.id = id;
exports.list = list;
exports.min = min;
exports.max = max;
exports.resource = resource;
exports.apiKey = apiKey;
function driver(baseDriverType, typeSpecificMeta) {
    return $metaSupport$.driverInfo(baseDriverType, typeSpecificMeta);
}
function record(description) {
    return $metaSupport$.record(description);
}
function roleRequired(role) {
    return function (target) {
        return Reflect.defineMetadata("pixi:roleRequired", role, target);
    };
}
function property(description, readOnly) {
    return $metaSupport$.property(description, readOnly);
}
function enumerated(...args) {
    return $metaSupport$.enumerated(args);
}
function callable(description) {
    return $metaSupport$.callable(description);
}
function parameter(description, optional) {
    return $metaSupport$.callableParameter({
        descr: description || "",
        opt: optional || false
    });
}
function field(description) {
    return $metaSupport$.fieldMetadata({ description: description });
}
function spotParameter() {
    return $metaSupport$.spotParameter();
}
function id(description) {
    return $metaSupport$.fieldMetadata({ description: description, id: true });
}
function list(ofType, description) {
    return $metaSupport$.fieldMetadata({ description: description, list: ofType });
}
function min(min) {
    return function (target, propertyKey) {
        Reflect.defineMetadata("pixi:min", min, target, propertyKey);
    };
}
function max(max) {
    return function (target, propertyKey) {
        Reflect.defineMetadata("pixi:max", max, target, propertyKey);
    };
}
function resource(roleRequired, verb) {
    return function (target, propertyKey) {
        const info = {
            auth: roleRequired || '',
            verb: verb || 'POST'
        };
        return Reflect.defineMetadata("pixi:resource", info, target, propertyKey);
    };
}
function apiKey(keyName) {
    return function (target, propertyKey) {
        Reflect.defineMetadata("pixi:apiKey", keyName, target, propertyKey);
    };
}
