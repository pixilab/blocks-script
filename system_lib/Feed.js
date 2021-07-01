define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Feed = void 0;
    var Feed = (function () {
        function Feed(env) {
            this.__feedEnv = env;
        }
        Feed.prototype.establishFeed = function (feed) {
            this.__feedEnv.establishFeed(feed);
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
    }());
    exports.Feed = Feed;
});
