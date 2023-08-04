/*
    This is a simple general-purpose user script that can be used to bind
    "source" properties to "destination" properties. Any changes to the source 
    property will be applied to the destination property.

    Use the "bind" and "unbind" callables to bind and unbind properties. The
    property paths must be complete paths written in dot notation, e.g. 
    "Realm.Main.variable.myVariable.value".

    IMPORTANT: The script does not check compatibility between source and
    destination properties: *You* have to make sure that the source property is 
    of the same type as the destination property and that the destination 
    property is writeable!

    Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
    melvinm1 2023-08-03
*/

import { callable, parameter } from "../system_lib/Metadata";
import { PropertyAccessor, Script, ScriptEnv } from "../system_lib/Script";
import { PrimitiveValue } from "../system_lib/ScriptBase";

interface Dictionary<T> {
    [id: string]: T;
}

interface ReusableAccessor {
    accessor: PropertyAccessor<PrimitiveValue>;
    usedBy: number; // Number of bindings using the accessor
}

interface Binding {
    scaleFactor: number; // Default is 1
    offset: number; // Default is 0
}

export class PropertyBinder extends Script {
    // We keep a dictionary of all PropertyAccessors that are in use. Doing so,
    // we can reuse the same PropertyAccessors for multiple bindings. The
    // dictionary is keyed by property path.
    private accessors: Dictionary<ReusableAccessor> = {};
    
    // We use two dictionaries to represent the bindings. The first dictionary
    // is keyed by source property paths. The second dictionary is keyed by 
    // destination paths.
    private bindings: Dictionary<Dictionary<Binding>> = {};

    constructor(env: ScriptEnv) {
        super(env);
    }

    @callable("Binds a source property to a destination property.")
    public bind(
        @parameter("Full path to source property.") source: string,
        @parameter("Full path to destination property.") destination: string,
        @parameter("Scale factor to apply.", true) scaleFactor?: number,
        @parameter("Offset to apply.", true) offset?: number
    ): void {
        let binding = {
            scaleFactor: scaleFactor !== undefined ? scaleFactor : 1,
            offset: offset !== undefined ? offset : 0
        }
        if (this.bindings[source] && this.bindings[source][destination]) {
            this.bindings[source][destination] = binding;
            return; // Source has already been bound to destination
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

    @callable("Unbinds a source property from a destination property.")
    public unbind(
        @parameter("Full path to source property.") source: string,
        @parameter("Full path to destination property.") destination: string 
    ): void {
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

    /**
     * Creates and returns a new ReusableAccessor.
     */
    private createReusableAccessor(propertyPath: string): ReusableAccessor {
        return {
            accessor: this.getProperty(propertyPath, (newValue) => {
                this.handleValueChange(propertyPath, newValue);
            }),
            usedBy: 0
        }
    }

    /**
     * Handles change to source value.
     */
    private handleValueChange(source: string, newValue: PrimitiveValue): void {
        if (this.bindings[source]) {
            for (const destination in this.bindings[source]) {
                if (this.accessors[destination]) {
                    try {
                        let binding = this.bindings[source][destination];

                        // Apply scaleFactor and offset only if it is a number
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
