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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "../system_lib/Metadata", "../system_lib/Script"], function (require, exports, Metadata_1, Script_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PropertyBinder = void 0;
    var PropertyBinder = exports.PropertyBinder = (function (_super) {
        __extends(PropertyBinder, _super);
        function PropertyBinder(env) {
            var _this = _super.call(this, env) || this;
            _this.accessors = {};
            _this.bindings = {};
            return _this;
        }
        PropertyBinder.prototype.bind = function (source, destination, scaleFactor, offset) {
            var binding = {
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
        };
        PropertyBinder.prototype.unbind = function (source, destination) {
            if (this.bindings[source] && this.bindings[source][destination]) {
                var sourceAccessor = this.accessors[source];
                var destAccessor = this.accessors[destination];
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
        };
        PropertyBinder.prototype.createReusableAccessor = function (propertyPath) {
            var _this = this;
            return {
                accessor: this.getProperty(propertyPath, function (newValue) {
                    _this.handleValueChange(propertyPath, newValue);
                }),
                usedBy: 0
            };
        };
        PropertyBinder.prototype.handleValueChange = function (source, newValue) {
            if (this.bindings[source]) {
                for (var destination in this.bindings[source]) {
                    if (this.accessors[destination]) {
                        try {
                            var binding = this.bindings[source][destination];
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
        };
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
        return PropertyBinder;
    }(Script_1.Script));
});
