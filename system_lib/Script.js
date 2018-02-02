/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     Ultimate base class for all TypeScript based user scripts.
     */
    var Script = (function () {
        function Script(env) {
            this.__scriptFacade = env;
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
                            this.changed(name);
                    }
                },
                enumerable: true,
                configurable: true
            });
        };
        /**	Inform others that prop has changed, causing any
         *	subscribers to be notified soon.
         */
        Script.prototype.changed = function (prop) {
            this.__scriptFacade.changed(prop);
        };
        return Script;
    }());
    exports.Script = Script;
});
