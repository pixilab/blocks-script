/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */
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
    /**
     Ultimate base class for all TypeScript based user scripts.
     */
    var Script = (function (_super) {
        __extends(Script, _super);
        function Script() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /** Expose a dynamic property of type T with specified options and name.
         */
        Script.prototype.property = function (name, options, setGetFunc) {
            this.__scriptFacade.property(name, options, setGetFunc);
            // A little dance to make this work also for direct JS-style assignment
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
        /**
         * Establish a named channel associated with this script, with optional "data received
         * on channel" handler function.
         */
        Script.prototype.establishChannel = function (leafChannelName, callback) {
            if (callback) {
                this.__scriptFacade.establishChannel(leafChannelName, function (sender, axon) {
                    callback(axon.data);
                });
            }
            else
                this.__scriptFacade.establishChannel(leafChannelName);
        };
        /**
         * Send data on my named channel.
         */
        Script.prototype.sendOnChannel = function (leafChannelName, data) {
            this.__scriptFacade.sendOnChannel(leafChannelName, data);
        };
        return Script;
    }(ScriptBase_1.ScriptBase));
    exports.Script = Script;
});
