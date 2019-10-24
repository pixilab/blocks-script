/*
 * A skeleton driver for sending data to devices supporting REST-style commands over HTTP,
 * such as the Panasonic "HD Integrated Camera". I'm not actually a "real" driver. I don't
 * connect to the socket.  Instead I pick up its address, then use SimpleHTTP to do the
 * communicaiton instead.
 *
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define(["require", "exports", "system/SimpleHTTP", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, SimpleHTTP_1, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PanasonicPanTilt = (function (_super) {
        __extends(PanasonicPanTilt, _super);
        function PanasonicPanTilt(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            /*	Some devide state. Initial value could be read back from device
                rather than hard-coded.
             */
            _this.mPower = false;
            _this.mPan = 0.5; // Initial/center position
            _this.mTilt = 0.5;
            _this.processor = new CmdProcessor(socket.address);
            return _this;
        }
        Object.defineProperty(PanasonicPanTilt.prototype, "power", {
            get: function () {
                return this.mPower;
            },
            set: function (state) {
                this.mPower = state;
                this.sendRawCommand('O' + (state ? '1' : '0'));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PanasonicPanTilt.prototype, "pan", {
            get: function () {
                return this.mPan;
            },
            set: function (state) {
                if (this.mPan !== state) {
                    this.mPan = state;
                    this.sendPanTiltSoon();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PanasonicPanTilt.prototype, "tilt", {
            get: function () {
                return this.mTilt;
            },
            set: function (state) {
                if (this.mTilt !== state) {
                    this.mTilt = state;
                    this.sendPanTiltSoon();
                }
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Send a pan/tilt command soon. I expose those as separate properties, but they
         * are sent as one command. Defer sending a bit to allow both values to be combined
         * if changed closely together.
         */
        PanasonicPanTilt.prototype.sendPanTiltSoon = function () {
            var _this = this;
            if (!this.panTiltPending) {
                this.panTiltPending = wait(100);
                this.panTiltPending.then(function () {
                    var cmd = 'APC' +
                        toFourHex(_this.mPan * 0xffff) +
                        toFourHex(_this.mTilt * 0xffff);
                    _this.sendRawCommand(cmd);
                    _this.panTiltPending = undefined;
                });
            }
        };
        /**
         * Send "raw" command to the device. Mainly for testing purposes. Use properties
         * for most "real" device state, and callable functions when you must.
         */
        PanasonicPanTilt.prototype.sendRawCommand = function (rawCommand) {
            var result = this.processor.sendCommand(rawCommand);
            result.then(function (response) { return log("Response", response); });
            return result;
        };
        return PanasonicPanTilt;
    }(Driver_1.Driver));
    __decorate([
        Meta.property("Camera power control"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], PanasonicPanTilt.prototype, "power", null);
    __decorate([
        Meta.property("Camera pan, normalized 0…1"),
        Meta.min(0),
        Meta.max(1),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], PanasonicPanTilt.prototype, "pan", null);
    __decorate([
        Meta.property("Camera tilt, normalized 0…1"),
        Meta.min(0),
        Meta.max(1),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], PanasonicPanTilt.prototype, "tilt", null);
    __decorate([
        Meta.callable("Send raw command to device"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", Promise)
    ], PanasonicPanTilt.prototype, "sendRawCommand", null);
    PanasonicPanTilt = __decorate([
        Meta.driver('NetworkTCP', { port: 80 }),
        __metadata("design:paramtypes", [Object])
    ], PanasonicPanTilt);
    exports.PanasonicPanTilt = PanasonicPanTilt;
    /**
     * Queue up commands to be sent, spacing them out to be sent no faster than
     * kMillisPerCmd, according to the protocol spec.
     */
    var CmdProcessor = (function () {
        function CmdProcessor(server) {
            this.server = server;
            this.cmdQueue = []; // Waiting commands
        }
        /**
         * Send a command. Return a promise that will be resolved once the command
         * has been promised successfully, where the result of the promise contains
         * the data returned from the other side.
         */
        CmdProcessor.prototype.sendCommand = function (command) {
            log("sendCommand", command);
            var cmd = new Cmd(command);
            if (this.cmdQueue.length > 30)
                throw "Command buffer overflow";
            this.cmdQueue.push(cmd);
            this.doNextCommand();
            return cmd.getPromise();
        };
        /**
         * If no command currently in flight, initiate one.
         */
        CmdProcessor.prototype.doNextCommand = function () {
            var _this = this;
            if (!this.currCmd && this.cmdQueue.length) {
                var cmd_1 = this.cmdQueue.shift();
                this.currCmd = cmd_1;
                cmd_1.getRequest(this.server).get().then(function (result) {
                    cmd_1.handleResponse(result.data);
                    return wait(CmdProcessor.kMillisPerCmd);
                }, function (error) {
                    cmd_1.fail(error);
                    return wait(CmdProcessor.kMillisPerCmd);
                }).finally(function () {
                    log("Finally");
                    _this.currCmd = undefined;
                    // Proceed with next command, if any
                    _this.doNextCommand();
                });
            }
        };
        return CmdProcessor;
    }());
    CmdProcessor.kMillisPerCmd = 130; // Milliseconds to space commands apart
    /**
    Internal log function, making my logging easy to turn on/off.
    */
    function log() {
        var toLog = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            toLog[_i] = arguments[_i];
        }
        // console.log(toLog);	// Uncomment to enable logging
    }
    /**
     * Maintain the state and life-cycle of a single command.
     */
    var Cmd = (function () {
        /**
         * Create a command, where the command string is what needs to follow after the
         * initial / in the request. Must ONLY contain URL-compatible characters.
         */
        function Cmd(command) {
            var _this = this;
            this.command = command;
            this.outcome = new Promise(function (resolver, rejector) {
                _this.resolver = resolver;
                _this.rejector = rejector;
            });
        }
        Cmd.prototype.getPromise = function () {
            return this.outcome;
        };
        Cmd.prototype.getRequest = function (server) {
            var url = 'http://' + server + '/cgi-bin/aw_ptz?cmd=%23' + this.command + '&res=1';
            log("URL", url);
            return SimpleHTTP_1.SimpleHTTP.newRequest(url);
        };
        /**
         * Accumulate any response data received from the other end
         */
        Cmd.prototype.handleResponse = function (response) {
            this.resolver(response);
        };
        /**
         * Final death-knell of this command, rejecting it with the specified error.
         */
        Cmd.prototype.fail = function (error) {
            this.rejector(error);
        };
        return Cmd;
    }());
    /**
     * Convert num to exactly four hex digit (upper case).
     */
    function toFourHex(num) {
        num = Math.round(num);
        var hexDigits = num.toString(16).toUpperCase();
        var numDigits = hexDigits.length;
        if (numDigits > 4)
            return 'FFFF';
        return '000'.substr(numDigits - 1) + hexDigits;
    }
});
