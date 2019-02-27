var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "system_lib/ScriptBase"], function (require, exports, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Script = (function (_super) {
        __extends(Script, _super);
        function Script() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Script.prototype.property = function (name, options, setGetFunc) {
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
        Script.prototype.getProperty = function (fullPath, changeNotification) {
            return this.__scriptFacade.getProperty(fullPath, changeNotification);
        };
        Script.prototype.establishChannel = function (leafChannelName, callback) {
            if (callback) {
                this.__scriptFacade.establishChannel(leafChannelName, function (sender, axon) {
                    callback(axon.data);
                });
            }
            else
                this.__scriptFacade.establishChannel(leafChannelName);
        };
        Script.prototype.sendOnChannel = function (leafChannelName, data) {
            this.__scriptFacade.sendOnChannel(leafChannelName, data);
        };
        return Script;
    }(ScriptBase_1.ScriptBase));
    exports.Script = Script;
});
