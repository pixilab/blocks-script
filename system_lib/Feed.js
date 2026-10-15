"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Feed = void 0;
const ScriptBase_1 = require("./ScriptBase");
class Feed extends ScriptBase_1.ScriptBase {
    constructor(env) {
        super(env);
    }
    establishFeed(feed) {
        this.__scriptFacade.establishFeed(feed);
    }
    refreshFeed(instanceName) {
        this.__scriptFacade.refreshFeed(instanceName);
    }
}
exports.Feed = Feed;
