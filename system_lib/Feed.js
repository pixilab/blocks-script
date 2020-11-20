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
        return Feed;
    }());
    exports.Feed = Feed;
});
