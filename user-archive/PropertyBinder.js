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
exports.PropertyBinder = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Script_1 = require("../system_lib/Script");
class PropertyBinder extends Script_1.Script {
    accessors = {};
    bindings = {};
    constructor(env) {
        super(env);
    }
    bind(source, destination, scaleFactor, offset) {
        let binding = {
            scaleFactor: scaleFactor !== undefined ? scaleFactor : 1,
            offset: offset !== undefined ? offset : 0
        };
        if (this.bindings[source] && this.bindings[source][destination]) {
            this.bindings[source][destination] = binding;
            return;
        }
        if (!(source in this.accessors)) {
            try {
                this.accessors[source] = this.createReusableAccessor(source);
            }
            catch (err) {
                throw "Could not access source property!";
            }
        }
        if (!(destination in this.accessors)) {
            try {
                this.accessors[destination] =
                    this.createReusableAccessor(destination);
            }
            catch (err) {
                this.accessors[source].accessor.close();
                delete this.accessors[source];
                throw "Could not access destination property!";
            }
        }
        ++this.accessors[source].usedBy;
        ++this.accessors[destination].usedBy;
        if (this.bindings[source] === undefined) {
            this.bindings[source] = {};
        }
        this.bindings[source][destination] = binding;
    }
    unbind(source, destination) {
        if (this.bindings[source] && this.bindings[source][destination]) {
            let sourceAccessor = this.accessors[source];
            let destAccessor = this.accessors[destination];
            if (--sourceAccessor.usedBy <= 0) {
                sourceAccessor.accessor.close();
                delete this.accessors[source];
            }
            if (--destAccessor.usedBy <= 0) {
                destAccessor.accessor.close();
                delete this.accessors[destination];
            }
            delete this.bindings[source][destination];
        }
        else {
            throw "Source has not been bound to destination!";
        }
    }
    createReusableAccessor(propertyPath) {
        return {
            accessor: this.getProperty(propertyPath, (newValue) => {
                this.handleValueChange(propertyPath, newValue);
            }),
            usedBy: 0
        };
    }
    handleValueChange(source, newValue) {
        if (this.bindings[source]) {
            for (const destination in this.bindings[source]) {
                if (this.accessors[destination]) {
                    try {
                        let binding = this.bindings[source][destination];
                        if (typeof newValue === "number") {
                            this.accessors[destination].accessor.value =
                                newValue * binding.scaleFactor + binding.offset;
                        }
                        else {
                            this.accessors[destination].accessor.value = newValue;
                        }
                    }
                    catch (err) {
                        console.error("Could not set", destination, "to", source);
                    }
                }
            }
        }
    }
}
exports.PropertyBinder = PropertyBinder;
__decorate([
    (0, Metadata_1.callable)("Binds a source property to a destination property."),
    __param(0, (0, Metadata_1.parameter)("Full path to source property.")),
    __param(1, (0, Metadata_1.parameter)("Full path to destination property.")),
    __param(2, (0, Metadata_1.parameter)("Scale factor to apply.", true)),
    __param(3, (0, Metadata_1.parameter)("Offset to apply.", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], PropertyBinder.prototype, "bind", null);
__decorate([
    (0, Metadata_1.callable)("Unbinds a source property from a destination property."),
    __param(0, (0, Metadata_1.parameter)("Full path to source property.")),
    __param(1, (0, Metadata_1.parameter)("Full path to destination property.")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PropertyBinder.prototype, "unbind", null);
