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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var UIRobot = UIRobot_1 = (function (_super) {
        __extends(UIRobot, _super);
        function UIRobot(socket, bufferSize) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mLeftDown = false;
            _this.mRightDown = false;
            _this.mProgramParams = '';
            _this.mCurrentKeys = '';
            if (bufferSize)
                socket.setMaxLineLength(bufferSize);
            socket.enableWakeOnLAN();
            socket.autoConnect();
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection' && sender.connected)
                    _this.onConnectStateChanged(sender.connected);
            });
            if (socket.connected)
                _this.onConnectStateChanged(socket.connected);
            return _this;
        }
        UIRobot.prototype.onConnectStateChanged = function (connected) {
            if (!connected)
                this.mProgramParams = '';
        };
        UIRobot.prototype.wakeUp = function () {
            this.socket.wakeOnLAN();
        };
        Object.defineProperty(UIRobot.prototype, "leftDown", {
            get: function () {
                return this.mLeftDown;
            },
            set: function (value) {
                if (this.mLeftDown !== value) {
                    this.mLeftDown = value;
                    this.sendMouseButtonState(1024, value);
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(UIRobot.prototype, "rightDown", {
            get: function () {
                return this.mRightDown;
            },
            set: function (value) {
                if (this.mRightDown !== value) {
                    this.mRightDown = value;
                    this.sendMouseButtonState(4096, value);
                }
            },
            enumerable: true,
            configurable: true
        });
        UIRobot.prototype.moveMouse = function (x, y) {
            this.sendCommand('MouseMove', x, y);
        };
        Object.defineProperty(UIRobot.prototype, "program", {
            get: function () {
                return this.mProgramParams;
            },
            set: function (programParams) {
                var runningProgram = this.parseProgramParams(this.mProgramParams);
                if (runningProgram) {
                    this.sendCommand('Terminate', runningProgram.program);
                }
                var newProgram = this.parseProgramParams(programParams);
                if (newProgram) {
                    this.mProgramParams = programParams;
                    this.sendCommand.apply(this, ['Launch',
                        newProgram.workingDir,
                        newProgram.program].concat(newProgram.arguments));
                }
                else {
                    this.mProgramParams = '';
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(UIRobot.prototype, "keyDown", {
            get: function () {
                return this.mCurrentKeys;
            },
            set: function (keys) {
                var _this = this;
                this.mCurrentKeys = keys;
                if (!!this.mCurrentKeys) {
                    var keyPresses = keys.split('+');
                    var key = keyPresses[keyPresses.length - 1];
                    var modifierSum_1 = 0;
                    if (keyPresses.length > 1) {
                        var modifiers = keyPresses.slice(0, keyPresses.length - 1);
                        var modifierValues_1 = {
                            'shift': 1,
                            'control': 2,
                            'alt': 4,
                            'altgr': 8,
                            'meta': 16
                        };
                        modifiers.forEach(function (mod) { return modifierSum_1 += modifierValues_1[mod] || 0; });
                    }
                    this.sendCommand('KeyPress', key, modifierSum_1);
                    if (this.mKeyRlsTimer)
                        this.mKeyRlsTimer.cancel();
                    this.mKeyRlsTimer = wait(200);
                    this.mKeyRlsTimer.then(function () {
                        _this.keyDown = '';
                        _this.mKeyRlsTimer = undefined;
                    });
                }
            },
            enumerable: true,
            configurable: true
        });
        UIRobot.prototype.sendMouseButtonState = function (buttonMask, down) {
            this.sendCommand('MousePress', buttonMask, down ? 1 : 2);
        };
        UIRobot.prototype.sendCommand = function (command) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            command += ' ' + args.join(' ');
            return this.socket.sendText(command);
        };
        UIRobot.prototype.parseProgramParams = function (programParams) {
            if (programParams) {
                var params = programParams.split('|');
                var result = {
                    program: UIRobot_1.quote(params[0]),
                    workingDir: UIRobot_1.quote(params[1]) || '/',
                    arguments: params.slice(2)
                };
                return result;
            }
        };
        UIRobot.quote = function (str) {
            return '"' + str + '"';
        };
        return UIRobot;
    }(Driver_1.Driver));
    __decorate([
        Metadata_1.callable("Try to start the computer through wake on lan."),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], UIRobot.prototype, "wakeUp", null);
    __decorate([
        Metadata_1.property("Left mouse button down"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], UIRobot.prototype, "leftDown", null);
    __decorate([
        Metadata_1.property("Right mouse button down"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], UIRobot.prototype, "rightDown", null);
    __decorate([
        Metadata_1.callable("Move mouse by specified distance"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", void 0)
    ], UIRobot.prototype, "moveMouse", null);
    __decorate([
        Metadata_1.property("The program to start, will end any previously running program. Format is EXE_PATH|WORKING_DIR|...ARGS"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], UIRobot.prototype, "program", null);
    __decorate([
        Metadata_1.property("Send key strokes, modifiers before key"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], UIRobot.prototype, "keyDown", null);
    UIRobot = UIRobot_1 = __decorate([
        Metadata_1.driver('NetworkTCP', { port: 3047 }),
        __metadata("design:paramtypes", [Object, Number])
    ], UIRobot);
    exports.UIRobot = UIRobot;
    var UIRobot_1;
});
