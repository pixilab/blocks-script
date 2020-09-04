var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Kramer3000 = void 0;
    var Kramer3000 = (function (_super) {
        __extends(Kramer3000, _super);
        function Kramer3000(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            socket.subscribe('connect', function (sender) {
                if (sender.connected)
                    _this.initialPoll();
            });
            socket.subscribe('textReceived', function (sender, message) {
                return _this.handleFeedback(message.text);
            });
            _this.destinations = [];
            for (var destIx = 0; destIx < Kramer3000_1.kNumDests; ++destIx)
                _this.destinations.push(new SwitchDest(_this, destIx + 1));
            return _this;
        }
        Kramer3000_1 = Kramer3000;
        Kramer3000.prototype.initialPoll = function () {
            var compositePollMsg;
            for (var destIx = 0; destIx < Kramer3000_1.kNumDests; ++destIx) {
                if (!compositePollMsg)
                    compositePollMsg = '#';
                else
                    compositePollMsg += '|';
                compositePollMsg += this.destinations[destIx].getPollCommand();
            }
            this.socket.sendText(compositePollMsg);
        };
        Kramer3000.prototype.handleFeedback = function (msg) {
            var parseResult = Kramer3000_1.kFeedbackParser.exec(msg);
            if (parseResult && parseResult.length >= 5) {
                if (parseResult[1] === 'ROUTE') {
                    var destIndex = parseInt(parseResult[3]);
                    if (!isNaN(destIndex) && destIndex > 0 && destIndex <= Kramer3000_1.kNumDests) {
                        var sourceIndex = parseInt(parseResult[4]);
                        if (!isNaN(sourceIndex) && sourceIndex > 0 && sourceIndex <= Kramer3000_1.kNumSources) {
                            this.destinations[destIndex - 1].takeFeedback(sourceIndex);
                        }
                    }
                }
            }
        };
        var Kramer3000_1;
        Kramer3000.kNumDests = 8;
        Kramer3000.kNumSources = 64;
        Kramer3000.kFeedbackParser = /~\d+@(.+) (\d+),(\d+),(\d+)/;
        Kramer3000 = Kramer3000_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 5000 }),
            __metadata("design:paramtypes", [Object])
        ], Kramer3000);
        return Kramer3000;
    }(Driver_1.Driver));
    exports.Kramer3000 = Kramer3000;
    var SwitchDest = (function () {
        function SwitchDest(driver, index) {
            var _this = this;
            this.driver = driver;
            this.index = index;
            this.mSource = 0;
            this.srcPropName = "Dest" + index + "Source";
            driver.property(this.srcPropName, {
                type: Number,
                description: "The source number of this destination",
                min: 1,
                max: Kramer3000.kNumSources
            }, function (source) {
                if (source !== undefined) {
                    if (_this.mSource !== source) {
                        _this.mSource = source;
                        driver.socket.sendText('#ROUTE 1,' + _this.index + ',' + source);
                    }
                }
                return _this.mSource;
            });
        }
        SwitchDest.prototype.getPollCommand = function () {
            return 'ROUTE? 1,' + this.index;
        };
        SwitchDest.prototype.takeFeedback = function (source) {
            if (this.mSource !== source) {
                this.mSource = source;
                this.driver.changed(this.srcPropName);
            }
        };
        return SwitchDest;
    }());
});
