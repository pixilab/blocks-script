define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ScriptBase = (function () {
        function ScriptBase(scriptFacade) {
            this.__scriptFacade = scriptFacade;
        }
        ScriptBase.prototype.property = function (name, options, setGetFunc) {
            this.__scriptFacade.property(name, options, setGetFunc);
            Object.defineProperty(this.constructor.prototype, name, {
                get: function () {
                    return setGetFunc();
                },
                set: function (value) {
                    if (!options.readOnly) {
                        var oldValue = setGetFunc();
                        if (oldValue !== setGetFunc(value))
                            this.__scriptFacade.firePropChanged(name);
                    }
                },
                enumerable: true,
                configurable: true
            });
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
