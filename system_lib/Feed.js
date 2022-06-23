var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "./ScriptBase"], function (require, exports, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Feed = void 0;
    var Feed = (function (_super) {
        __extends(Feed, _super);
        function Feed(env) {
            return _super.call(this, env) || this;
        }
        Feed.prototype.establishFeed = function (feed) {
            this.__scriptFacade.establishFeed(feed);
        };
        Feed.makeJSArray = function (arrayLike) {
            if (Array.isArray(arrayLike) && arrayLike.sort && arrayLike.splice)
                return arrayLike;
            var realArray = [];
            var length = arrayLike.length;
            for (var i = 0; i < length; ++i)
                realArray.push(arrayLike[i]);
            return realArray;
        };
        return Feed;
    }(ScriptBase_1.ScriptBase));
    exports.Feed = Feed;
});
