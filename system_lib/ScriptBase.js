/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Common stuff shared between user scripts and drivers.
     */
    var ScriptBase = (function () {
        function ScriptBase(scriptFacade) {
            this.__scriptFacade = scriptFacade;
        }
        /**	Inform others that prop has changed, causing any
         *	subscribers to be notified soon.
         */
        ScriptBase.prototype.changed = function (prop) {
            this.__scriptFacade.changed(prop);
        };
        return ScriptBase;
    }());
    exports.ScriptBase = ScriptBase;
});
