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
        Feed.makeJSArray = function (arr) {
            if (Array.isArray(arr) && arr.sort && arr.splice)
                return arr;
            var result = [];
            var length = arr.length;
            for (var i = 0; i < length; ++i)
                result.push(arr[i]);
            return result;
        };
        return Feed;
    }());
    exports.Feed = Feed;
});
