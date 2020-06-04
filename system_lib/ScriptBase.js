define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ScriptBase = void 0;
    var ScriptBase = (function () {
        function ScriptBase(scriptFacade) {
            this.__scriptFacade = scriptFacade;
        }
        ScriptBase.prototype.property = function (name, options, gsFunc) {
            this.__scriptFacade.property(name, options, gsFunc);
            if (options && options.readOnly) {
                Object.defineProperty(this, name, {
                    get: function () {
                        return gsFunc();
                    }
                });
            }
            else {
                Object.defineProperty(this, name, {
                    get: function () {
                        return gsFunc();
                    },
                    set: function (value) {
                        var oldValue = gsFunc();
                        if (oldValue !== gsFunc(value))
                            this.__scriptFacade.firePropChanged(name);
                    }
                });
            }
        };
        ScriptBase.prototype.changed = function (prop) {
            this.__scriptFacade.changed(prop);
        };
        ScriptBase.prototype.makeJSArray = function (arr) {
            if (Array.isArray(arr))
                return arr;
            var arrayLike = arr;
            var result = [];
            for (var i = 0; i < arrayLike.length; ++i)
                result.push(arrayLike[i]);
            return result;
        };
        return ScriptBase;
    }());
    exports.ScriptBase = ScriptBase;
});
