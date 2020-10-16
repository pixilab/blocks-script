/*
	Driver for sending OSC signals, based on http://opensoundcontrol.org/spec-1_0

 	Copyright (c) 2019 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.2
  Features:
  - sending OSC messages
  - supported data types: int32, float32, string, boolean
 */

const MIN_INT32 = -0x80000000; // -2,147,483,648
const MAX_INT32 = +0x7FFFFFFF; // +2,147,483,647
const MIN_INT64 = -0x8000000000000000; // -9,223,372,036,854,775,808
const MAX_INT64 = +0x7FFFFFFFFFFFFFFF; // +9,223,372,036,854,775,807
const MIN_ABS_FLOAT32 = 1.1754943508e-38;
const MAX_SAFE_FLOAT32 = 8388607;
const MIN_SAFE_INT = -0x1FFFFFFFFFFFFF; // -9,007,199,254,740,991 // -(Math.pow(2, 53) - 1)
const MAX_SAFE_INT = +0x1FFFFFFFFFFFFF; // +9,007,199,254,740,991 // +(Math.pow(2, 53) - 1)

const OSC_TYPE_TAG_INT32 = 'i';   // 32-bit big-endian two's complement integer
const OSC_TYPE_TAG_FLOAT32 = 'f'; // 32-bit big-endian IEEE 754 floating point number
const OSC_TYPE_TAG_OSC_STRING = 's';
const OSC_TYPE_TAG_OSC_BLOB = 'b';

const OSC_TYPE_TAG_INT64 = 'h'; // 64 bit big-endian two's complement integer
const OSC_TYPE_TAG_FLOAT64 = 'd'; // 64 bit ("double") IEEE 754 floating point number
const OSC_TYPE_TAG_BOOLEAN_TRUE = 'T';
const OSC_TYPE_TAG_BOOLEAN_FALSE = 'F';

const split: any = require("lib/split-string");

import { NetworkUDP } from "system/Network";
import { Driver } from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";



@Meta.driver('NetworkUDP', { port: 8000 })
export class OSCviaUDP extends Driver<NetworkUDP> {

    regExFloat: RegExp = /^[-\+]?\d+\.\d+$/;
    regExInteger: RegExp = /^[-\+]?\d+$/;
    regExBoolean: RegExp = /^false|true$/;

    public constructor(private socket: NetworkUDP) {
        super(socket);
        // socket.subscribe('textReceived', (sender, message) => {
        // 	this.command = message.text
        // });
    }

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	isOfTypeName(typeName: string) {
		return typeName === "OSCviaUDP" ? this : null;
	}

    @Meta.callable('send OSC message')
    public sendMessage(
        @Meta.parameter('OSC address')
        address: string,
        @Meta.parameter('Comma separated value list. fx to send the values 1 (int), 2.0 (float), and "hello" (string) "1, 2.0, \'hello\'".', true)
        valueList?: string,
    ) {
        var tagsAndBytes: {} =
        {
            tags: ',',
            bytes: []
        }
        this.parseValueList(valueList ? valueList : '', tagsAndBytes);

        var bytes: number[] = [];

        // console.log(tagsAndBytes['tags']);

        // first address
        this.addRange(bytes, this.toOSCStringBytes(address));
        // then data type tags
        this.addRange(bytes, this.toOSCStringBytes(tagsAndBytes['tags']));
        // finally the data
        this.addRange(bytes, tagsAndBytes['bytes']);

        // send message
        this.socket.sendBytes(bytes);
    }

    private parseValueList(valueList: string, tagsAndBytes: {}) {
        var valueListParts = split(valueList, { separator: ',', quotes: true, brackets: { '[': ']' } });
        for (var i = 0; i < valueListParts.length; i++) {
            var valueString: string = valueListParts[i].trim();
            if (this.isFloat(valueString)) {
                const value: number = +valueString;
                this.addFloat(value, valueString, tagsAndBytes);
            }
            else if (this.isInteger(valueString)) {
                const value: number = +valueString;
                this.addInteger(value, tagsAndBytes);
            }
            else if (this.isBoolean(valueString)) {
                const value: boolean = (valueString == 'true');
                this.addBoolean(value, tagsAndBytes);
            }
            else if (this.isString(valueString)) {
                const value: string = valueString.substr(1, valueString.length - 2);
                this.addString(value, tagsAndBytes);
            }
        }
    }

    private isFloat(valueString: string): boolean {
        return this.regExFloat.test(valueString);
    }
    private isInteger(valueString: string): boolean {
        return this.regExInteger.test(valueString);
    }
    private isBoolean(valueString: string): boolean {
        return this.regExBoolean.test(valueString);
    }
    private isString(valueString: string): boolean {
        var length: number = valueString.length;
        if (length < 2) return false;
        var lastPos: number = length - 1;
        return (valueString[0] == '\'' && valueString[lastPos] == '\'') ||
            (valueString[0] == '"' && valueString[lastPos] == '"');
    }


    public addBoolean(
        value: boolean,
        tagsAndBytes: {}
    ) {
        tagsAndBytes['tags'] += value ? OSC_TYPE_TAG_BOOLEAN_TRUE : OSC_TYPE_TAG_BOOLEAN_FALSE;
    }

    public addInteger(
        value: number,
        tagsAndBytes: {}
    ) {
        if (value >= MIN_INT32 &&
            value <= MAX_INT32) {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_INT32;
            this.addRange(tagsAndBytes['bytes'], this.getInt32Bytes(value));
        }
        else {
            // TODO: getInt64Bytes is not correct
            // var bytes: number[] = this.getInt64Bytes(value);
            // this.addValue(message, OSC_TYPE_TAG_INT64, bytes);
            tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT64;
            this.addRange(tagsAndBytes['bytes'], this.getFloat64Bytes(value));
        }

    }

    public addFloat(
        value: number,
        valueString: string,
        tagsAndBytes: {}
    ) {
        var abs: number = Math.abs(value);
        if (//abs > MIN_ABS_FLOAT32 &&
            valueString.length <= 7) {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT32;
            this.addRange(tagsAndBytes['bytes'], this.getFloat32Bytes(value));
        }
        else {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT64;
            this.addRange(tagsAndBytes['bytes'], this.getFloat64Bytes(value));
        }
    }

    public addString(
        value: string,
        tagsAndBytes: {}
    ) {
        tagsAndBytes['tags'] += OSC_TYPE_TAG_OSC_STRING;
        this.addRange(tagsAndBytes['bytes'], this.toOSCStringBytes(value));
    }

    private toOSCStringBytes(str: string, ): number[] {
        var bytes = this.toBytesString(str);
        // string has to end on zero char
        if (bytes.length > 0 &&
            bytes[bytes.length - 1] != 0) {
            bytes.push(0);
        }
        this.addZeroes(bytes);
        return bytes;
    }

    private addZeroes(bytes: number[]) {
        // how many zero chars are needed to make the length a multiple of 4?
        // (multiple 32bit chunks)
        var modFour = bytes.length % 4;
        if (modFour == 0) return;
        var missingZeroes: number = 4 - modFour;
        for (var i = 0; i < missingZeroes; i++) {
            bytes.push(0);
        }
    }

    private addRange(array: number[], values: number[]) {
        for (var i = 0; i < values.length; i++) {
            array.push(values[i]);
        }
    }

    private toBytesString(str: string): number[] {
        var bytes: number[] = [];
        for (var i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }

    private getInt32Bytes(x: number): number[] {
        var bytes = [];
        var i = 4;
        do {
            bytes[--i] = x & (255);
            x = x >> 8;
        } while (i)
        return bytes;
    }
    private getInt64Bytes(integer: number): number[] {
        var bytes = [];
        var i = 8;
        do {
            bytes[--i] = integer & (255);
            integer = integer >> 8;
        } while (i)
        return bytes;
        // var intArray = new BigInt64Array(1);
        // intArray[0] = integer;
        // var byteArray = new Int8Array(intArray.buffer);
        // var bytes = [];
        // for (var i = byteArray.length - 1; i >= 0; i--) {
        //     bytes.push(byteArray[i]);
        // }
        // return bytes;
    }
    private getFloat32Bytes(float: number): number[] {
        var floatArray = new Float32Array(1);
        floatArray[0] = float;
        var byteArray = new Int8Array(floatArray.buffer);
        var bytes = [];
        for (var i = byteArray.length - 1; i >= 0; i--) {
            bytes.push(byteArray[i]);
        }
        return bytes;
    }
    private getFloat64Bytes(float: number): number[] {
        var floatArray = new Float64Array(1);
        floatArray[0] = float;
        var byteArray = new Int8Array(floatArray.buffer);
        var bytes = [];
        for (var i = byteArray.length - 1; i >= 0; i--) {
            bytes.push(byteArray[i]);
        }
        return bytes;
    }

    isInt(value: number): boolean {
        return typeof value === 'number' &&
            isFinite(value) &&
            Math.floor(value) === value;
    }
    isSafeInteger(value: number): boolean {
        return this.isInt(value) &&
            Math.abs(value) <= MAX_SAFE_INT;
    }
}
