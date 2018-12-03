define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ScriptBase = (function () {
        function ScriptBase(scriptFacade) {
            this.__scriptFacade = scriptFacade;
        }
        ScriptBase.prototype.changed = function (prop) {
            this.__scriptFacade.changed(prop);
        };
        return ScriptBase;
    }());
    exports.ScriptBase = ScriptBase;
});
