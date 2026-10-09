"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkDriver = void 0;
const Driver_1 = require("./Driver");
class NetworkDriver extends Driver_1.Driver {
    mySocket;
    constructor(mySocket) {
        super(mySocket);
        this.mySocket = mySocket;
    }
    get name() {
        return this.mySocket.name;
    }
    get fullName() {
        return this.mySocket.fullName;
    }
    get enabled() {
        return this.mySocket.enabled;
    }
    get address() {
        return this.mySocket.address;
    }
    get port() {
        return this.mySocket.port;
    }
}
exports.NetworkDriver = NetworkDriver;
