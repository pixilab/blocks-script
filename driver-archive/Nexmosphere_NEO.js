"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nexmosphere_NEO = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const NexmosphereBase_1 = require("../driver/NexmosphereBase");
const ScriptBase_1 = require("../system_lib/ScriptBase");
const kNumInterfaces = 4;
const kNumOutputs = 4;
let Nexmosphere_NEO = class Nexmosphere_NEO extends NexmosphereBase_1.NexmosphereBase {
    neo;
    outstandingModelQuery;
    constructor(port) {
        super(port, kNumInterfaces);
        this.initConnection(port);
        this.neo = this.namedAggregateProperty("neo", NeoOutput || NeoDevice || NeoRuntime || NeoDiagnostic || NeoSoftfuse || NeoWatchdog || NeoSchedule || NeoPwrXtalk || NeoSensmi);
        this.initNeo();
    }
    initNeo() {
        this.setTime();
        if (this.port.enabled) {
            this.send("P000B[MODEL?]");
            if (this.outstandingModelQuery) {
                try {
                    this.outstandingModelQuery.cancel();
                }
                catch (_) { }
                this.outstandingModelQuery = undefined;
            }
            this.outstandingModelQuery = wait(500);
            this.outstandingModelQuery
                .then(() => {
                this.log("Model query timed out, setting up default outputs");
                this.handleControllerMessage("MODEL=NEO640");
            }).catch(() => {
            });
            this.neo['input'] = new NeoDevice(this);
        }
    }
    considerConnected() {
        return this.port.connected;
    }
    setupOutputs(noOutputs) {
        for (let i = 0; i < noOutputs; i++) {
            this.neo[`output${i + 1}`] = new NeoOutput(this, i + 1);
        }
    }
    setTime(now) {
        if (!now)
            now = new Date();
        const timeStr = (0, NexmosphereBase_1.padVal)(now.getHours(), 2) + "." +
            (0, NexmosphereBase_1.padVal)(now.getMinutes(), 2) + "." +
            (0, NexmosphereBase_1.padVal)(now.getSeconds(), 2) + "-" +
            (0, NexmosphereBase_1.padVal)(now.getDate(), 2) + "/" +
            (0, NexmosphereBase_1.padVal)((now.getMonth() + 1), 2) + "/" +
            (0, NexmosphereBase_1.padVal)(now.getFullYear(), 4);
        this.log("Setting Neo time to servertime:", timeStr);
        this.send("S000B[TIME=" + timeStr + "]");
    }
    handlers = {
        'OUTPUT': (s) => {
            this.log('handle OUTPUT', s);
            const ix = "OUTPUT".length;
            const numChar = s.charAt(ix);
            const num = parseInt(numChar, 10);
            if (num != num || num < 1 || num > kNumOutputs) {
                console.warn('Unexpected number after OUTPUT:', numChar);
                return;
            }
            const data = s.slice(ix + 1);
            const key = `output${num}`;
            this.messageRouter(key, data);
        },
        'TIME': (s) => { this.log('handle TIME=', s); },
        'FWVERSION=': (s) => { this.log('FWVERSION=', s); },
        'WATCHDOG': (s) => { this.log('WATCHDOG', s); },
        'DEVICE': (s) => { this.log('DEVICEUSAGE=', s); },
        'INPUT': (s) => {
            this.log('handle INPUT=', s);
            this.messageRouter('input', s);
        },
        'SCHED': (s) => { this.log('SCHED', s); },
        'RUNTIME': (s) => { this.log('RUNTIME', s); },
        'OPERATIONTIME': (s) => { this.log('OPERATIONTIME', s); },
        'MODEL': (s) => {
            this.log('MODEL', s);
            if (this.outstandingModelQuery) {
                try {
                    this.outstandingModelQuery.cancel();
                }
                catch (_) { }
                this.outstandingModelQuery = undefined;
            }
            let command = s.split('=')[1];
            for (const key in this.modelHandlers) {
                if (key === command) {
                    this.modelHandlers[key]();
                    return;
                }
            }
        }
    };
    modelHandlers = {
        'NEO320': () => {
            this.log('handle NEO320');
            this.setupOutputs(2);
        },
        'NEO520': () => {
            this.log('handle NEO520');
            this.setupOutputs(2);
        },
        'NEO620': () => {
            this.log('handle NEO620');
            this.setupOutputs(2);
            this.neo['sensmi'] = new NeoSensmi(this);
        },
        'NEO340': () => {
            this.log('handle NEO340');
            this.setupOutputs(4);
        },
        'NEO540': () => {
            this.log('handle NEO540');
            this.setupOutputs(4);
        },
        'NEO640': () => {
            this.log('handle NEO640');
            this.setupOutputs(4);
            this.neo['sensmi'] = new NeoSensmi(this);
        },
    };
    handleControllerMessage(str) {
        for (const key in this.handlers) {
            if (str.indexOf(key) === 0) {
                this.handlers[key](str);
                return;
            }
        }
    }
    messageRouter(key, data) {
        const neoEntry = this.neo[key];
        if (neoEntry) {
            neoEntry.recieveData(data);
        }
        else {
            console.warn("No Neo output registered for", key);
        }
    }
    setContOutputMetrix(timeInSeconds = 0) {
        if (timeInSeconds > 0) {
            this.send("P000B[AUTOSEND=OUTPUTS:ALL:" + (0, NexmosphereBase_1.padVal)(timeInSeconds, 4) + "]");
        }
        else {
            this.send("P000B[AUTOSEND=OUTPUTS:ALL:OFF]");
        }
    }
    setContInputMetrix(timeInSeconds = 0) {
        if (timeInSeconds > 0) {
            this.send("P000B[AUTOSEND=INPUT:ALL:" + (0, NexmosphereBase_1.padVal)(timeInSeconds, 4) + "]");
        }
        else {
            this.send("P000B[AUTOSEND=INPUT:ALL:OFF]");
        }
    }
};
exports.Nexmosphere_NEO = Nexmosphere_NEO;
__decorate([
    (0, Metadata_1.callable)("Enable continious updates of output metrics"),
    __param(0, (0, Metadata_1.parameter)("Enable continious update at interval 0 or no value for off", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], Nexmosphere_NEO.prototype, "setContOutputMetrix", null);
__decorate([
    (0, Metadata_1.callable)("Enable continious updates of input metrics"),
    __param(0, (0, Metadata_1.parameter)("Enable continious update at interval 0 or no value for off", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], Nexmosphere_NEO.prototype, "setContInputMetrix", null);
exports.Nexmosphere_NEO = Nexmosphere_NEO = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
    (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
    __metadata("design:paramtypes", [Object])
], Nexmosphere_NEO);
class NeoBaseClass extends ScriptBase_1.AggregateElem {
    index = 0;
    owner;
    constructor(driver, ix) {
        super();
        this.owner = driver;
        if (ix !== undefined)
            this.index = ix;
    }
    handlers = {};
    sendData(data) {
        this.owner.send(data);
    }
    recieveData(str) {
        this.owner.log("Data received in NeoBaseClass reviceData:", str);
        const keyValuePair = str.split("=");
        const keyInStr = keyValuePair[0] || "EMPTY";
        this.owner.log("Parsed key:", keyInStr);
        const value = keyValuePair[1];
        for (const key in this.handlers) {
            if (keyInStr.indexOf(key) === 0) {
                this.handlers[keyInStr](value);
                return;
            }
        }
        console.warn("No matching output handler for:", str);
    }
}
class NeoDevice extends NeoBaseClass {
    _voltage = 0;
    _current = 0;
    _power = 0;
    _usage = 0;
    constructor(owner, ix) {
        super(owner, ix);
    }
    handlers = {
        'INPUTCURRENT': (s) => {
            this.owner.log('handle INPUTCURRENT=', s);
            this.inputCurrent = parseFloat(s.replace(",", "."));
        },
        'INPUTVOLTAGE': (s) => {
            this.owner.log('handle INPUTVOLTAGE=', s);
            this.inputVoltage = parseFloat(s.replace(",", "."));
        },
        'INPUTPOWER': (s) => {
            this.owner.log('handle INPUTPOWER=', s);
            this.inputPower = parseFloat(s.replace(",", "."));
        },
        'INPUTUSAGE': (s) => {
            this.owner.log('handle INPUTUSAGE=', s);
            this.inputUsage = parseFloat(s.replace(",", "."));
        }
    };
    updateInputMeasurements() {
        this.sendData("P000B[INPUTVOLTAGE?]");
        this.sendData("P000B[INPUTCURRENT?]");
        this.sendData("P000B[INPUTPOWER?]");
        this.sendData("P000B[INPUTUSAGE?]");
    }
    resetInputUsage() {
        this.sendData("P000B[INPUT=USAGERESET]");
    }
    get inputVoltage() { return this._voltage; }
    set inputVoltage(value) {
        if (value != this._voltage)
            this._voltage = value;
    }
    get inputCurrent() { return this._current; }
    set inputCurrent(value) {
        this.owner.log("Setting input current to:", value);
        if (value != this._current)
            this._current = value;
    }
    get inputPower() { return this._power; }
    set inputPower(value) {
        if (value != this._power)
            this._power = value;
    }
    get inputUsage() { return this._power; }
    set inputUsage(value) {
        if (value != this._usage)
            this._usage = value;
    }
}
__decorate([
    (0, Metadata_1.callable)("Update input measurements"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NeoDevice.prototype, "updateInputMeasurements", null);
__decorate([
    (0, Metadata_1.callable)("Reset input usage to zero"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NeoDevice.prototype, "resetInputUsage", null);
__decorate([
    (0, Metadata_1.property)("Input Voltage", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoDevice.prototype, "inputVoltage", null);
__decorate([
    (0, Metadata_1.property)("Input Current", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoDevice.prototype, "inputCurrent", null);
__decorate([
    (0, Metadata_1.property)("Input Power", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoDevice.prototype, "inputPower", null);
__decorate([
    (0, Metadata_1.property)("Input Energy Usage", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoDevice.prototype, "inputUsage", null);
class NeoRuntime extends NeoBaseClass {
}
class NeoDiagnostic extends NeoBaseClass {
}
class NeoSoftfuse extends NeoBaseClass {
}
class NeoWatchdog extends NeoBaseClass {
}
class NeoSchedule extends NeoBaseClass {
}
class NeoPwrXtalk extends NeoBaseClass {
}
class NeoSensmi extends NeoBaseClass {
    configureSensmi(deviceName, cuid, country, area, city) {
        this.sendData("SENSMI[PROV=ON]");
        this.sendData("SENSMI[DEVICENAME=" + deviceName + "]");
        this.sendData("SENSMI[CUID=" + cuid + "]");
        if (country)
            this.sendData("SENSMI[COUNTRY=" + country + "]");
        if (area)
            this.sendData("SENSMI[AREA=" + area + "]");
        if (city)
            this.sendData("SENSMI[CITY=" + city + "]");
        this.sendData("SENSMI[PROV=SAVE]");
        this.sendData("SENSMI[PROV=OFF]");
    }
}
__decorate([
    (0, Metadata_1.callable)("Configure SensMI connection"),
    __param(0, (0, Metadata_1.parameter)("Device Name")),
    __param(1, (0, Metadata_1.parameter)("CUID, customer user id")),
    __param(2, (0, Metadata_1.parameter)("Country", true)),
    __param(3, (0, Metadata_1.parameter)("Area", true)),
    __param(4, (0, Metadata_1.parameter)("City", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], NeoSensmi.prototype, "configureSensmi", null);
class NeoOutput extends NeoBaseClass {
    mIx = 0;
    mRelay = true;
    mCurrent = 0;
    mPower = 0;
    mUsage = 0;
    mVoltage = 0;
    constructor(owner, ix) {
        super(owner, ix);
        this.mIx = ix;
        this.owner = owner;
    }
    handlers = {
        'EMPTY': (s) => {
            this.owner.log('handle status (EMPTY)', s);
            this.mRelay = s === "ON";
            this.changed("relay");
        },
        'USAGE': (s) => {
            this.owner.log('handle USAGE', s);
            this.usage = parseFloat(s.replace(",", "."));
        },
        'POWER': (s) => {
            this.owner.log('handle POWER', s);
            this.power = parseFloat(s.replace(",", "."));
        },
        'CURRENT': (s) => {
            this.owner.log('handle CURRENT', s);
            this.current = parseFloat(s.replace(",", "."));
        },
        'VOLTAGE': (s) => {
            this.owner.log('handle VOLTAGE', s);
            this.voltage = parseFloat(s.replace(",", "."));
        }
    };
    get relay() { return this.mRelay; }
    set relay(value) {
        if (this.mRelay === value)
            return;
        this.mRelay = value;
        this.owner.send("P000B[OUTPUT" + +this.mIx + "=" + (value ? "ON" : "OFF") + "]");
    }
    get voltage() { return this.mVoltage; }
    set voltage(value) {
        if (value != this.mVoltage)
            this.mVoltage = value;
    }
    get current() { return this.mCurrent; }
    set current(value) {
        if (value != this.mCurrent)
            this.mCurrent = value;
    }
    get power() { return this.mPower; }
    set power(value) {
        if (value != this.mPower)
            this.mPower = value;
    }
    get usage() { return this.mUsage; }
    set usage(value) {
        if (value != this.mUsage)
            this.mUsage = value;
    }
    resetUsage() {
        this.usage = 0;
        this.sendData("P000B[OUTPUT" + this.mIx + "USAGERESET]");
    }
    updateMetrics() {
        this.sendData("P000B[OUTPUT" + this.mIx + "CURRENT?]");
        this.sendData("P000B[OUTPUT" + this.mIx + "POWER?]");
        this.sendData("P000B[OUTPUT" + this.mIx + "USAGE?]");
        this.sendData("P000B[OUTPUT" + this.mIx + "VOLTAGE?]");
    }
}
__decorate([
    (0, Metadata_1.property)("Output relay", false),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], NeoOutput.prototype, "relay", null);
__decorate([
    (0, Metadata_1.property)("Output voltage", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoOutput.prototype, "voltage", null);
__decorate([
    (0, Metadata_1.property)("Output current", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoOutput.prototype, "current", null);
__decorate([
    (0, Metadata_1.property)("Output power", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoOutput.prototype, "power", null);
__decorate([
    (0, Metadata_1.property)("Output energy usage", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], NeoOutput.prototype, "usage", null);
__decorate([
    (0, Metadata_1.callable)("Reset energy usage to zero"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NeoOutput.prototype, "resetUsage", null);
__decorate([
    (0, Metadata_1.callable)("Update output metrics properties"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NeoOutput.prototype, "updateMetrics", null);
