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
var UIRobot_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIRobot = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let UIRobot = class UIRobot extends Driver_1.Driver {
    static { UIRobot_1 = this; }
    socket;
    mLeftDown = false;
    mRightDown = false;
    mPower = false;
    mProgramParams = '';
    mCurrentKeys = '';
    mKeyRlsTimer;
    woLRetryPromise;
    woLRetryAttempts;
    static kPowerDownProgram = "C:/Windows/System32/shutdown.exe||/s /f /t 0";
    static kWoLRetryInterval = 1000 * 20;
    static kWoLRetryMaxAttempts = 10;
    constructor(socket, bufferSize) {
        super(socket);
        this.socket = socket;
        if (bufferSize)
            socket.setMaxLineLength(bufferSize);
        socket.enableWakeOnLAN();
        socket.autoConnect();
        socket.subscribe('connect', (sender, message) => {
            if (message.type === 'Connection')
                this.onConnectStateChanged(sender.connected);
        });
        if (socket.connected)
            this.onConnectStateChanged(true);
    }
    onConnectStateChanged(connected) {
        if (connected)
            this.power = true;
        else
            this.mProgramParams = '';
    }
    set power(power) {
        if (this.mPower !== power) {
            this.mPower = power;
            this.cancelWoLRetry();
            if (power) {
                if (this.program === UIRobot_1.kPowerDownProgram)
                    this.program = '';
                this.woLRetryAttempts = 0;
                this.tryWakeUp();
            }
            else
                this.program = UIRobot_1.kPowerDownProgram;
        }
    }
    get power() {
        return this.mPower;
    }
    tryWakeUp() {
        if (!this.socket.connected) {
            if (this.woLRetryAttempts < UIRobot_1.kWoLRetryMaxAttempts) {
                this.socket.wakeOnLAN();
                this.woLRetryPromise = wait(UIRobot_1.kWoLRetryInterval);
                this.woLRetryPromise.then(() => this.tryWakeUp());
                this.woLRetryAttempts += 1;
            }
            else {
                this.woLRetryPromise = undefined;
                this.power = false;
            }
        }
        else
            this.woLRetryPromise = undefined;
    }
    cancelWoLRetry() {
        if (this.woLRetryPromise) {
            this.woLRetryPromise.cancel();
            this.woLRetryPromise = undefined;
        }
    }
    set leftDown(value) {
        if (this.mLeftDown !== value) {
            this.mLeftDown = value;
            this.sendMouseButtonState(1024, value);
        }
    }
    get leftDown() {
        return this.mLeftDown;
    }
    set rightDown(value) {
        if (this.mRightDown !== value) {
            this.mRightDown = value;
            this.sendMouseButtonState(4096, value);
        }
    }
    get rightDown() {
        return this.mRightDown;
    }
    moveMouse(x, y) {
        this.sendCommand('MouseMove', x, y);
    }
    transitoryCommand(exePath, workingDirectory, args) {
        let params = [];
        if (args)
            params = args.split('|');
        params.unshift(exePath);
        params.unshift(workingDirectory);
        return this.sendCommand('Launch', ...params);
    }
    set program(programParams) {
        if (this.mProgramParams !== programParams) {
            const runningProgram = this.parseProgramParams(this.mProgramParams);
            if (runningProgram) {
                this.sendCommand('Terminate', runningProgram.program);
            }
            const newProgram = this.parseProgramParams(programParams);
            if (newProgram) {
                this.mProgramParams = programParams;
                this.sendCommand('Launch', newProgram.workingDir, newProgram.program, ...newProgram.arguments);
            }
            else {
                this.mProgramParams = '';
            }
        }
    }
    get program() {
        return this.mProgramParams;
    }
    set keyDown(keys) {
        this.mCurrentKeys = keys;
        if (!!this.mCurrentKeys) {
            const keyPresses = keys.split('+');
            const key = keyPresses[keyPresses.length - 1];
            let modifierSum = 0;
            if (keyPresses.length > 1) {
                let modifiers = keyPresses.slice(0, keyPresses.length - 1);
                const modifierValues = {
                    'shift': 1,
                    'control': 2,
                    'alt': 4,
                    'altgr': 8,
                    'meta': 16
                };
                modifiers.forEach(mod => modifierSum += modifierValues[mod] || 0);
            }
            this.sendCommand('KeyPress', key, modifierSum);
            if (this.mKeyRlsTimer)
                this.mKeyRlsTimer.cancel();
            this.mKeyRlsTimer = wait(200);
            this.mKeyRlsTimer.then(() => {
                this.keyDown = '';
                this.mKeyRlsTimer = undefined;
            });
        }
    }
    get keyDown() {
        return this.mCurrentKeys;
    }
    sendMouseButtonState(buttonMask, down) {
        this.sendCommand('MousePress', buttonMask, down ? 1 : 2);
    }
    sendCommand(command, ...args) {
        command += ' ' + args.join(' ');
        return this.socket.sendText(command);
    }
    parseProgramParams(programParams) {
        if (programParams) {
            const params = programParams.split('|');
            const result = {
                program: UIRobot_1.quote(params[0]),
                workingDir: UIRobot_1.quote(params[1]) || '/',
                arguments: params.slice(2)
            };
            return result;
        }
    }
    static quote(str) {
        return '"' + str + '"';
    }
};
exports.UIRobot = UIRobot;
__decorate([
    (0, Metadata_1.property)("Power computer on/off"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], UIRobot.prototype, "power", null);
__decorate([
    (0, Metadata_1.property)("Left mouse button down"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], UIRobot.prototype, "leftDown", null);
__decorate([
    (0, Metadata_1.property)("Right mouse button down"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], UIRobot.prototype, "rightDown", null);
__decorate([
    (0, Metadata_1.callable)("Move mouse by specified distance"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], UIRobot.prototype, "moveMouse", null);
__decorate([
    (0, Metadata_1.callable)("Transitory command to run"),
    __param(0, (0, Metadata_1.parameter)("Path to executable command to run")),
    __param(1, (0, Metadata_1.parameter)("Working directory to be applied")),
    __param(2, (0, Metadata_1.parameter)("Additional arguments, separated by vertical bar", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], UIRobot.prototype, "transitoryCommand", null);
__decorate([
    (0, Metadata_1.property)("The program to start, will end any previously running program. Format is EXE_PATH|WORKING_DIR|...ARGS"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], UIRobot.prototype, "program", null);
__decorate([
    (0, Metadata_1.property)("Send key strokes, modifiers before key"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], UIRobot.prototype, "keyDown", null);
exports.UIRobot = UIRobot = UIRobot_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 3047 }),
    __metadata("design:paramtypes", [Object, Number])
], UIRobot);
