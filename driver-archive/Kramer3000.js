"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Kramer3000_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kramer3000 = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let Kramer3000 = class Kramer3000 extends Driver_1.Driver {
    static { Kramer3000_1 = this; }
    socket;
    destinations;
    static kNumDests = 8;
    static kNumSources = 64;
    static kFeedbackParser = /~\d+@(.+) (\d+),(\d+),(\d+)/;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
        socket.subscribe('connect', sender => {
            if (sender.connected)
                this.initialPoll();
        });
        socket.subscribe('textReceived', (sender, message) => this.handleFeedback(message.text));
        this.destinations = [];
        for (var destIx = 0; destIx < Kramer3000_1.kNumDests; ++destIx)
            this.destinations.push(new SwitchDest(this, destIx + 1));
    }
    initialPoll() {
        var compositePollMsg;
        for (var destIx = 0; destIx < Kramer3000_1.kNumDests; ++destIx) {
            if (!compositePollMsg)
                compositePollMsg = '#';
            else
                compositePollMsg += '|';
            compositePollMsg += this.destinations[destIx].getPollCommand();
        }
        this.socket.sendText(compositePollMsg);
    }
    handleFeedback(msg) {
        const parseResult = Kramer3000_1.kFeedbackParser.exec(msg);
        if (parseResult && parseResult.length >= 5) {
            if (parseResult[1] === 'ROUTE') {
                const destIndex = parseInt(parseResult[3]);
                if (!isNaN(destIndex) && destIndex > 0 && destIndex <= Kramer3000_1.kNumDests) {
                    const sourceIndex = parseInt(parseResult[4]);
                    if (!isNaN(sourceIndex) && sourceIndex > 0 && sourceIndex <= Kramer3000_1.kNumSources) {
                        this.destinations[destIndex - 1].takeFeedback(sourceIndex);
                    }
                }
            }
        }
    }
};
exports.Kramer3000 = Kramer3000;
exports.Kramer3000 = Kramer3000 = Kramer3000_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 5000 }),
    __metadata("design:paramtypes", [Object])
], Kramer3000);
class SwitchDest {
    driver;
    index;
    srcPropName;
    mSource = 0;
    constructor(driver, index) {
        this.driver = driver;
        this.index = index;
        this.srcPropName = "Dest" + index + "Source";
        driver.property(this.srcPropName, {
            type: Number,
            description: "The source number of this destination",
            min: 1,
            max: Kramer3000.kNumSources
        }, (source) => {
            if (source !== undefined) {
                if (this.mSource !== source) {
                    this.mSource = source;
                    driver.socket.sendText('#ROUTE 1,' + this.index + ',' + source);
                }
            }
            return this.mSource;
        });
    }
    getPollCommand() {
        return 'ROUTE? 1,' + this.index;
    }
    takeFeedback(source) {
        if (this.mSource !== source) {
            this.mSource = source;
            this.driver.changed(this.srcPropName);
        }
    }
}
