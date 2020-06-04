var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "system_lib/ScriptBase"], function (require, exports, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Script = void 0;
    var Script = (function (_super) {
        __extends(Script, _super);
        function Script() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Script.prototype.getProperty = function (fullPath, changeNotification) {
            return changeNotification ?
                this.__scriptFacade.getProperty(fullPath, changeNotification) :
                this.__scriptFacade.getProperty(fullPath);
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
