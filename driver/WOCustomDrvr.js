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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "driver/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     A driver using a TCP socket for communicating with a "device".
    
     This driver talks to WATCHOUT production software, controlling some basic
     functions. It's intended only as an example, as Blocks already has full
     support for controlling WATCHOUT. Using WATCHOUT as an example device
     has some distinct advantages:
    
     1. Many of you are already familiar with WATCHOUT.
     2. The production software UI clearly shows what's going on.
     3. It's available as a free download, so anyone can use it to play
        with this example code.
    
     Some notes the on the "Meta.driver" annotations below.
    
     The port value specified indicates the default TCP port number,
     selected automatically when chosing this driver. The 'NetworkTCP' string
     specifies that this driver is intended for that type of subsystem, and
     its constructor will accept that type.
     */
    var WOCustomDrvr = WOCustomDrvr_1 = (function (_super) {
        __extends(WOCustomDrvr, _super);
        /**
         * Create me, attached to the network socket I communicate through. When using a
         * driver, the driver replaces the built-in functionality of the network socket
         with the properties and callable functions exposed.
         */
        function WOCustomDrvr(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            // IMPORTANT: The class name above MUST match the name of the
            // file (minus its extension).
            _this.pendingQueries = {};
            _this.mAsFeedback = false; // Set while processing feedback, to only fire events
            _this.mConnected = false; // Connected to WATCHOUT
            _this.mPlaying = false; // Most recent state (obtained from WO initially)
            _this.mStandBy = false;
            _this.mLevel = 0; // Numeric state of Output
            socket.subscribe('connect', function (sender, message) {
                // console.info('connect msg', message.type);
                _this.connectStateChanged();
            });
            socket.subscribe('textReceived', function (sender, msg) {
                return _this.textReceived(msg.text);
            });
            socket.autoConnect(); // Use automatic connection mechanism
            _this.mConnected = socket.connected; // May already be connected
            if (_this.mConnected)
                _this.getInitialStatus(); // If so, get status right away
            return _this;
        }
        Object.defineProperty(WOCustomDrvr.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            /**
             Connection status. The @Meta.property annotation publishes the specified
             value as a property that can be accessed from panels. Note that I *do* define a
             setter, which is necessary for any state change to be pushed to panels and other
             clients. The last parameter to the property annotation still specifies that
             this is a read-only property, since we're using autoConnection, and this can't
             be changed from the outside.
             */
            set: function (online) {
                this.mConnected = online;
                // console.info("Connection state", online)
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WOCustomDrvr.prototype, "playing", {
            get: function () {
                return this.mPlaying;
            },
            /**
             * Main timeline playback state. Where both a set and get function are provided,
             * the value can also be set from a button. It is, however, possible to have a
             * set implementation while still exposing the property as read-only by
             * setting the second (optional) parameter of the @Meta.property annotation
             * to true. This is useful for values you may want to set internally, from
             * within the driver itself, and that should then update UI bound to the property.
             */
            set: function (play) {
                if (!this.mAsFeedback)
                    this.tell(play ? "run" : "halt"); // Start/stop main timeline
                this.mPlaying = play;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WOCustomDrvr.prototype, "standBy", {
            get: function () {
                return this.mStandBy;
            },
            /**
             * Set and get the standBy mode of the cluster.
             */
            set: function (stby) {
                if (!this.mAsFeedback)
                    this.tell(stby ? "standBy true 1000" : "standBy false 1000");
                this.mStandBy = stby;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WOCustomDrvr.prototype, "input", {
            get: function () {
                return this.mLevel;
            },
            /**
             * An input value, that can be bound to a slider. Here the min and max annotations are
             * also used to specify the acceptable range of the numeric value.
             */
            set: function (level) {
                this.tell("setInput In1 " + level);
                this.mLevel = level;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * A function that can be called from a Task, supplying multiple parameters.
    
           IMPORTANT: If a callable returns a Promise, any task invoking it will
           stall until the promise is resolved/rejected.
         */
        WOCustomDrvr.prototype.playAuxTimeline = function (name, start) {
            this.tell((start ? "run " : "kill ") + name);
        };
        /**
         Connection state changed. If became connected, poll WO for some initial
         status. Called as a result of the 'connect' subscription done in the
         constructor.
         */
        WOCustomDrvr.prototype.connectStateChanged = function () {
            // console.info("connectStateChanged", this.socket.connected);
            this.connected = this.socket.connected; // Propagate state to clients
            if (this.socket.connected)
                this.getInitialStatus();
            else
                this.discardAllQueries();
        };
        /** Obtain initial state from WATCHOUT as I wake up, to make sure
            we're on the same page.
        */
        WOCustomDrvr.prototype.getInitialStatus = function () {
            var _this = this;
            // console.info("getInitialStatus");
            this.ask('getStatus').then(function (reply) {
                _this.mAsFeedback = true; // Calling setters for feedback only
                // See getStatus reply in WO manual for details
                // console.info("getStatus reply", reply);
                var pieces = reply.split(' ');
                if (pieces[4] === 'true') {
                    // Go through setters to notify any listeners out there
                    _this.playing = (pieces[7] === 'true');
                    _this.standBy = (pieces[9] === 'true');
                    // console.info("got initial status", this.playing, this.standBy);
                }
                _this.mAsFeedback = false;
            });
        };
        /**
         * Tell WATCHOUt something through the TCP socket. Funnel most commands through here
         * to also allow them to be logged, which makes testing easier.
         */
        WOCustomDrvr.prototype.tell = function (data) {
            // console.info('tell', data);
            this.socket.sendText(data);
        };
        /**	Got data from WATCHOUT. Parse out any ID and reply, and forward
            to the pending query handler.
        */
        WOCustomDrvr.prototype.textReceived = function (text) {
            // console.info("textReceived", text);
            var pieces = WOCustomDrvr_1.kReplyParser.exec(text);
            if (pieces && pieces.length > 3) {
                var id = pieces[1];
                var what = pieces[2];
                var query = this.pendingQueries[id];
                if (query) {
                    delete this.pendingQueries[id]; // Now taken
                    query.handleResult(what, pieces[3]);
                }
                else
                    console.warn("Unexpected reply", text);
            }
            else
                console.warn("Spurious data", text);
        };
        /** Send question to WO, returning a Promise resolved with the reply
            that eventually comes back, or rejected if error.
        */
        WOCustomDrvr.prototype.ask = function (question) {
            if (this.socket.connected) {
                var query = new Query(question);
                this.pendingQueries[query.id] = query;
                // console.info('ask', query.fullCmd);
                this.socket.sendText(query.fullCmd);
                return query.promise;
            }
            else
                console.error("Can't ask. Not connected");
        };
        /**	Fail all pending queries. Call when connection is lost,
            or other similar catastrophic event that invalidates
            all questions.
        */
        WOCustomDrvr.prototype.discardAllQueries = function () {
            for (var queryId in this.pendingQueries) {
                this.pendingQueries[queryId].fail("Discarded");
            }
            this.pendingQueries = {};
        };
        return WOCustomDrvr;
    }(Driver_1.Driver));
    // A regex for parsing replies from WO
    WOCustomDrvr.kReplyParser = /\[([^\]]+)\](\w*)[\s]?(.*)/;
    __decorate([
        Meta.property("Connected to WATCHOUT", true),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], WOCustomDrvr.prototype, "connected", null);
    __decorate([
        Meta.property("Main timeline playing"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], WOCustomDrvr.prototype, "playing", null);
    __decorate([
        Meta.property("Standby mode"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], WOCustomDrvr.prototype, "standBy", null);
    __decorate([
        Meta.property("Generic input level"),
        Meta.min(0),
        Meta.max(1),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], WOCustomDrvr.prototype, "input", null);
    __decorate([
        Meta.callable("Play or stop any auxiliary timeline"),
        __param(0, Meta.parameter("Name of aux timeline to control")),
        __param(1, Meta.parameter("Whether to start the timeline")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Boolean]),
        __metadata("design:returntype", void 0)
    ], WOCustomDrvr.prototype, "playAuxTimeline", null);
    WOCustomDrvr = WOCustomDrvr_1 = __decorate([
        Meta.driver('NetworkTCP', { port: 3040 }),
        __metadata("design:paramtypes", [Object])
    ], WOCustomDrvr);
    exports.WOCustomDrvr = WOCustomDrvr;
    /**	Keeping track of an outstanding query sent to WO, to be resolved
        when corresponding reply arrives.
    */
    var Query = (function () {
        /**
         * Create a query tagged with a unique ID, allowing the reply to be
         * tied back to the promise awaiting it, once the response arrives.
         */
        function Query(cmd) {
            var _this = this;
            this.mPromise = new Promise(function (resolve, reject) {
                // Stash callbacks for later
                _this.resolver = resolve;
                _this.rejector = reject;
            });
            var id = ++Query.prevId;
            this.mId = id;
            this.mFullCmd = '[' + id + ']' + cmd;
        }
        Object.defineProperty(Query.prototype, "id", {
            // Getters for some read-only fields
            get: function () { return this.mId; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Query.prototype, "fullCmd", {
            get: function () { return this.mFullCmd; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Query.prototype, "promise", {
            get: function () { return this.mPromise; },
            enumerable: true,
            configurable: true
        });
        /** A reply to query arrived. Resolve promise if was Reply, reject it
            if anything other than Reply (could be smarter about this, such
            as dealing with Busy replies, but after all, this is just
            example code).
        */
        Query.prototype.handleResult = function (what, remainder) {
            if (what === 'Reply')
                this.resolver(remainder);
            else
                this.fail(remainder);
        };
        /**	Query failed. Let anyone waiting for it know by rejecting the promise.
        */
        Query.prototype.fail = function (error) {
            this.rejector(error);
        };
        return Query;
    }());
    Query.prevId = 0; // Generate unique query IDs from here
    var WOCustomDrvr_1;
});
