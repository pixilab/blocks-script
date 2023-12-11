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
    exports.SamsungMDC = void 0;
    var kHeaderData = 0xAA;
    var kAckData = 0x41;
    var SamsungMDC = exports.SamsungMDC = (function (_super) {
        __extends(SamsungMDC, _super);
        function SamsungMDC(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mId = 0;
            if (socket.enabled) {
                socket.autoConnect(true);
                socket.enableWakeOnLAN();
                _this.propList = [];
                _this.propList.push(_this.powerProp = new Power(_this));
                _this.inputProp = new NumProp(_this, "input", "Source input number; HDMI1=33, HDMI2=34, URL=99", 0x14, 0x21, 9, 99);
                _this.propList.push(_this.inputProp);
                _this.propList.push(_this.volumeProp = new Volume(_this));
                socket.subscribe('connect', function (sender, message) {
                    return _this.connectStateChanged(message.type);
                });
                socket.subscribe('bytesReceived', function (sender, msg) {
                    return _this.dataReceived(msg.rawData);
                });
                socket.subscribe('finish', function (sender) { return _this.discard(); });
                if (socket.connected)
                    _this.pollNow();
            }
            return _this;
        }
        SamsungMDC.prototype.isOfTypeName = function (typeName) {
            return typeName === "SamsungMDC" ? this : null;
        };
        SamsungMDC.prototype.wakeUp = function () {
            this.socket.wakeOnLAN();
        };
        Object.defineProperty(SamsungMDC.prototype, "id", {
            get: function () {
                return this.mId;
            },
            set: function (id) {
                this.mId = id;
            },
            enumerable: false,
            configurable: true
        });
        SamsungMDC.prototype.discard = function () {
            this.discarded = true;
            this.cancelPollAndRetry();
        };
        SamsungMDC.prototype.cancelPollAndRetry = function () {
            if (this.poller) {
                this.poller.cancel();
                this.poller = undefined;
            }
            if (this.correctionRetry) {
                this.correctionRetry.cancel();
                this.correctionRetry = undefined;
            }
            if (this.cmdTimeout) {
                this.cmdTimeout.cancel();
                this.cmdTimeout = undefined;
            }
        };
        SamsungMDC.prototype.errorMsg = function () {
            var messages = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                messages[_i] = arguments[_i];
            }
            messages.unshift(this.socket.fullName);
            console.error(messages);
        };
        SamsungMDC.prototype.warnMsg = function () {
            var messages = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                messages[_i] = arguments[_i];
            }
            messages.unshift(this.socket.fullName);
            console.warn(messages);
        };
        SamsungMDC.prototype.getPropToSend = function () {
            for (var _i = 0, _a = this.propList; _i < _a.length; _i++) {
                var p = _a[_i];
                if (p.needsCorrection())
                    return p;
            }
        };
        SamsungMDC.prototype.sendCorrection = function () {
            var _this = this;
            if (this.okToSendNewCommand()) {
                var prop = this.getPropToSend();
                if (prop) {
                    if (prop.canSendOffline() || (this.powerProp.getCurrent() && this.socket.connected)) {
                        debugMsg("sendCorrection prop", prop.name, "from", prop.getCurrent(), "to", prop.get());
                        var promise = prop.correct();
                        if (promise) {
                            promise.catch(function () {
                                if (_this.getPropToSend())
                                    _this.retryCorrectionSoon();
                            });
                        }
                        else
                            this.retryCorrectionSoon();
                    }
                }
            }
            else
                debugMsg("sendCorrection NOT", this.currCmd);
        };
        SamsungMDC.prototype.okToSendNewCommand = function () {
            return !this.discarded && !this.currCmd && !this.correctionRetry;
        };
        SamsungMDC.prototype.retryCorrectionSoon = function () {
            var _this = this;
            if (!this.correctionRetry && !this.discarded) {
                this.correctionRetry = wait(500);
                this.correctionRetry.then(function () {
                    _this.correctionRetry = undefined;
                    _this.sendCorrection();
                });
            }
        };
        SamsungMDC.prototype.connectStateChanged = function (type) {
            debugMsg("connectStateChanged", type, this.socket.connected);
            if (type === 'Connection') {
                if (!this.socket.connected)
                    this.cancelPollAndRetry();
                else
                    this.pollNow();
            }
            else if (type === 'ConnectionFailed')
                this.powerProp.updateCurrent(false);
        };
        SamsungMDC.prototype.pollSoon = function (howSoonMillis) {
            var _this = this;
            if (howSoonMillis === void 0) { howSoonMillis = 5333; }
            if (!this.discarded) {
                this.poller = wait(howSoonMillis);
                this.poller.then(function () {
                    _this.poller = undefined;
                    if (_this.okToSendNewCommand())
                        _this.pollNow();
                    else
                        _this.pollSoon(600);
                });
            }
        };
        SamsungMDC.prototype.pollNow = function () {
            var _this = this;
            this.startRequest(new Command("status", this.id, 0x00)).then(function (reply) {
                if (reply.length >= 4) {
                    debugMsg("Got status pollSoon reply", reply);
                    _this.powerProp.updateCurrent(!!reply[0]);
                    var volNorm = reply[1];
                    if (volNorm == 0xff)
                        volNorm = 0;
                    volNorm = volNorm / 100;
                    _this.volumeProp.updateCurrent(volNorm);
                    _this.inputProp.updateCurrent(reply[3]);
                }
            });
            this.pollSoon();
        };
        SamsungMDC.prototype.dataReceived = function (rawData) {
            var buf = this.receivedData;
            rawData = this.makeJSArray(rawData);
            buf = this.receivedData = buf ? buf.concat(rawData) : rawData;
            debugMsg("Got some data back");
            if (buf.length > 5 + 1) {
                if (this.currCmd) {
                    if (buf[0] !== kHeaderData)
                        this.currCmdErr('Invalid header in reply');
                    else if (buf[4] === kAckData) {
                        var responseType = buf[1];
                        if (buf[1] === 0xff) {
                            responseType = buf[5];
                            if (responseType === this.currCmd.cmdType) {
                                var numParams = buf[3] - (5 - 3);
                                var paramOffs = 5 + 1;
                                if (buf.length >= paramOffs + numParams) {
                                    this.requestSuccess(buf.slice(paramOffs, paramOffs + numParams));
                                    debugMsg("ACK for cmd type", responseType);
                                }
                            }
                            else
                                this.currCmdErr('Unexpected response type ' + responseType);
                        }
                        else
                            this.currCmdErr('Unexpected response command' + responseType);
                    }
                    else
                        this.currCmdErr('NAK response');
                }
                else
                    this.warnMsg("Unexpected data from device", rawData.toString());
            }
        };
        SamsungMDC.prototype.currCmdErr = function (excuse) {
            this.requestFailure(excuse + ' ' + this.currCmd.toString());
        };
        SamsungMDC.prototype.startRequest = function (cmd) {
            var _this = this;
            this.currCmd = cmd;
            this.receivedData = undefined;
            this.socket.sendBytes(cmd.getBytes());
            var result = new Promise(function (resolve, reject) {
                _this.currResolver = resolve;
                _this.currRejector = reject;
            });
            this.cmdTimeout = wait(10000);
            this.cmdTimeout.then(function () {
                _this.requestFailure("Timeout for " + cmd);
                if (cmd.name !== 'power') {
                    _this.socket.disconnect();
                    _this.powerProp.updateCurrent(false);
                }
            });
            return result;
        };
        SamsungMDC.prototype.requestSuccess = function (result) {
            var _this = this;
            debugMsg("Request succeded", this.currCmd.name);
            if (this.currResolver)
                this.currResolver(result);
            this.requestClear();
            asap(function () { return _this.sendCorrection(); });
        };
        SamsungMDC.prototype.requestFailure = function (msg) {
            debugMsg("Request failed", msg || this.currCmd.name);
            var rejector = this.currRejector;
            this.requestClear();
            if (rejector)
                rejector(msg);
        };
        SamsungMDC.prototype.requestClear = function () {
            if (this.cmdTimeout)
                this.cmdTimeout.cancel();
            this.cmdTimeout = undefined;
            this.currCmd = undefined;
            this.currRejector = undefined;
            this.currResolver = undefined;
            this.receivedData = undefined;
        };
        __decorate([
            (0, Metadata_1.property)("The target ID (rarely used over network)"),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(254),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SamsungMDC.prototype, "id", null);
        SamsungMDC = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 1515 }),
            __metadata("design:paramtypes", [Object])
        ], SamsungMDC);
        return SamsungMDC;
    }(Driver_1.Driver));
    var Command = (function () {
        function Command(name, id, cmdType, paramByte) {
            this.name = name;
            this.cmdType = cmdType;
            var cmd = [];
            cmd.push(kHeaderData);
            cmd.push(cmdType);
            cmd.push(id);
            if (paramByte !== undefined) {
                cmd.push(1);
                paramByte = Math.max(0, Math.round(paramByte)) & 0xff;
                cmd.push(paramByte);
            }
            else
                cmd.push(0);
            var checksum = 0;
            var count = cmd.length;
            for (var ix = 1; ix < count; ++ix)
                checksum += cmd[ix];
            cmd.push(checksum & 0xff);
            this.cmd = cmd;
        }
        Command.prototype.getBytes = function () {
            return this.cmd;
        };
        Command.prototype.toString = function () {
            return this.name + ' ' + this.cmd.toString();
        };
        return Command;
    }());
    var Prop = (function () {
        function Prop(driver, type, name, description, cmdByte, current) {
            var _this = this;
            this.driver = driver;
            this.name = name;
            this.cmdByte = cmdByte;
            this.current = current;
            driver.property(name, {
                type: type,
                description: description,
            }, function (setValue) {
                if (setValue !== undefined) {
                    if (_this.set(setValue))
                        _this.driver.sendCorrection();
                }
                return _this.get();
            });
        }
        Prop.prototype.canSendOffline = function () {
            return false;
        };
        Prop.prototype.get = function () {
            return this.wanted != undefined ? this.wanted : this.current;
        };
        Prop.prototype.getCurrent = function () {
            return this.current;
        };
        Prop.prototype.set = function (state) {
            var news = this.wanted !== state;
            this.wanted = state;
            return news;
        };
        Prop.prototype.updateCurrent = function (newState) {
            var lastCurrent = this.current;
            this.current = newState;
            if (lastCurrent !== newState && newState !== undefined) {
                debugMsg("updateCurrent", this.cmdByte, newState);
                if (lastCurrent === this.wanted) {
                    this.wanted = newState;
                    this.notifyListeners();
                    debugMsg("updateCurrent wag dog", this.name, newState);
                }
                else if (this.wanted === undefined)
                    this.notifyListeners();
            }
        };
        Prop.prototype.notifyListeners = function () {
            this.driver.changed(this.name);
        };
        Prop.prototype.needsCorrection = function () {
            return this.wanted !== undefined &&
                this.current !== this.wanted;
        };
        Prop.prototype.correctWithValue = function (value) {
            return this.correct2(new Command(this.name, this.driver.id, this.cmdByte, value));
        };
        Prop.prototype.correct2 = function (cmd) {
            var _this = this;
            var wanted = this.wanted;
            var result = this.driver.startRequest(cmd);
            result.then(function () {
                _this.current = wanted;
                debugMsg("correct2 succeeded for command type", _this.cmdByte, "with wanted value", wanted);
            });
            return result;
        };
        return Prop;
    }());
    var BoolProp = (function (_super) {
        __extends(BoolProp, _super);
        function BoolProp(driver, propName, description, cmdByte, current) {
            return _super.call(this, driver, Boolean, propName, description, cmdByte, current) || this;
        }
        BoolProp.prototype.correct = function () {
            return this.correctWithValue(this.wanted ? 1 : 0);
        };
        return BoolProp;
    }(Prop));
    var Power = (function (_super) {
        __extends(Power, _super);
        function Power(driver) {
            return _super.call(this, driver, "power", "Power display on/off", 0x11, false) || this;
        }
        Power.prototype.canSendOffline = function () {
            return this.wanted;
        };
        Power.prototype.correct = function () {
            if (this.wanted)
                this.driver.wakeUp();
            return _super.prototype.correct.call(this);
        };
        return Power;
    }(BoolProp));
    var NumProp = (function (_super) {
        __extends(NumProp, _super);
        function NumProp(driver, propName, description, cmdByte, current, min, max) {
            if (min === void 0) { min = 0; }
            if (max === void 0) { max = 1; }
            var _this = _super.call(this, driver, Number, propName, description, cmdByte, current) || this;
            _this.min = min;
            _this.max = max;
            return _this;
        }
        NumProp.prototype.correct = function (wantedValue) {
            if (wantedValue === void 0) { wantedValue = this.wanted; }
            return this.correctWithValue(wantedValue);
        };
        NumProp.prototype.set = function (v) {
            if (v < this.min || v > this.max) {
                console.error("Value out of range for", this.name, v);
                return false;
            }
            return _super.prototype.set.call(this, v);
        };
        return NumProp;
    }(Prop));
    var Volume = (function (_super) {
        __extends(Volume, _super);
        function Volume(driver) {
            return _super.call(this, driver, "volume", "Volume level, normalized 0...1", 0x12, 1) || this;
        }
        Volume.prototype.correct = function () {
            return _super.prototype.correct.call(this, this.wanted * 100);
        };
        return Volume;
    }(NumProp));
    function debugMsg() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
    }
});
