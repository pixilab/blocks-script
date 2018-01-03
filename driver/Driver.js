/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     Ultimate base class for all script-based drivers.
     */
    var Driver = /** @class */ (function () {
        function Driver(scriptFacade) {
            this.__scriptFacade = scriptFacade;
        }
        return Driver;
    }());
    exports.Driver = Driver;
});
