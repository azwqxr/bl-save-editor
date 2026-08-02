/*
hello sir -az
 */

"use strict";

/* ========================================================= */

class EncodeContext {

    constructor(options = {}) {

        this.registry = options.registry || null;

        this.components = [];

        this.errors = [];

        this.strict = !!options.strict;

    }

}

/* ========================================================= */

class Encoder {

    constructor(context = new EncodeContext()) {

        this.context = context;

    }

    /* ===================================================== */

    encode(components) {

        if (!Array.isArray(components))
            throw new Error("Encoder.encode expects an array.");

        this.context.components = components;

        const output = [];

        for (const component of components) {

            output.push(

                this.encodeComponent(component)

            );

        }

        return output.join(";");

    }

    /* ===================================================== */

    encodeComponent(component) {

        if (!component)
            return "";

        let text = "";

        //----------------------------------------
        // Component ID
        //----------------------------------------

        text += component.id;

        //----------------------------------------
        // Fixed data
        //----------------------------------------

        text += this.encodeFixedData(component);

        //----------------------------------------
        // Variable data
        //----------------------------------------

        text += this.encodeOptionalData(component);

        return text;

    }

    /* ===================================================== */

/* ===================================================== */

encodeFixedData(component) {

    this.validate(component);

    let text = "";

    //----------------------------------------
    // Position (4 chars)
    //----------------------------------------

    try {

        text += this.encodePosition(component.position);

    } catch (err) {

        this.context.errors.push(
            "Position encode failed: " + err.message
        );

        text += "AAAA"; // safe fallback

    }

    //----------------------------------------
    // Rotation (1 char)
    //----------------------------------------

    try {

        text += this.encodeRotation(
            component.rotation
        );

    } catch (err) {

        this.context.errors.push(
            "Rotation encode failed: " + err.message
        );

        text += "A";

    }

    //----------------------------------------
    // Color (4 chars)
    //----------------------------------------

    try {

        text += this.encodeColor(component.color);

    } catch (err) {

        this.context.errors.push(
            "Color encode failed: " + err.message
        );

        text += "AAAA";

    }

    //----------------------------------------
    // Material (0–1 char)
    //----------------------------------------

    try {

        const mat = this.encodeMaterial(
            component.material
        );

        if (mat) {

            // do not allow delimiters
            if (mat === "/" || mat === "=" || mat === "^") {

                this.context.errors.push(
                    "Invalid material char: " + mat
                );

            } else {

                text += mat;

            }

        }

    } catch (err) {

        this.context.errors.push(
            "Material encode failed: " + err.message
        );

    }

    return text;

}

    }

    /* ===================================================== */

/* ===================================================== */
/* OPTIONAL DATA                                         */
/* ===================================================== */

encodeOptionalData(component) {

    let text = "";

    //----------------------------------------
    // Allow plugins to update customData,
    // worldID and wireData before encoding.
    //----------------------------------------

    this.runPlugin(component);

    //----------------------------------------
    // Custom data (/)
    //----------------------------------------

    if (
        component.customData !== undefined &&
        component.customData !== null &&
        component.customData !== ""
    ) {

        text += "/";
        text += component.customData;

    }

    //----------------------------------------
    // World ID (=)
    //----------------------------------------

    if (
        component.worldID !== undefined &&
        component.worldID !== null &&
        component.worldID !== ""
    ) {

        text += "=";
        text += component.worldID;

    }

    //----------------------------------------
    // Wire data (^)
    //----------------------------------------

    if (
        component.wireData !== undefined &&
        component.wireData !== null &&
        component.wireData !== ""
    ) {

        text += "^";
        text += component.wireData;

    }

    return text;

}

/* ===================================================== */
/* Plugin Encoder                                        */
/* ===================================================== */

runPlugin(component) {

    if (!this.context.registry)
        return;

    const plugin =
        this.context.registry.get(component.id);

    if (!plugin)
        return;

    if (typeof plugin.encode !== "function")
        return;

    try {

        plugin.encode(component);

    }

    catch (err) {

        this.context.errors.push(

            "Plugin encode error (" +
            component.id +
            "): " +
            err.message

        );

    }

}

/* ===================================================== */
/* Helper                                                */
/* ===================================================== */

hasOptionalData(component) {

    return (

        component.customData ||

        component.worldID ||

        component.wireData

    );

}

/* ===================================================== */
/* Helper                                                */
/* ===================================================== */

clearOptionalData(component) {

    component.customData = "";

    component.worldID = "";

    component.wireData = "";

}

    }

    /* ===================================================== */

    validate(component) {

        if (!component.id)
            throw new Error("Component has no ID.");

        if (!component.position)
            throw new Error("Component has no position.");

        if (!component.color)
            throw new Error("Component has no color.");

    }

    /* ===================================================== */

    clone(component) {

        return structuredClone(component);

    }

}
/* ========================================================= */
/* Base71 helper wrappers                                    */
/* ========================================================= */

Encoder.prototype.encodePosition = function(position) {

    return Base71.encodePosition(

        position.x,

        position.y,

        position.z

    );

};

Encoder.prototype.encodeColor = function(color) {

    return Base71.encodeColor(

        color.r,

        color.g,

        color.b

    );

};

Encoder.prototype.encodeRotation = function(rotation) {

    if (!rotation || typeof rotation !== "string")
        return "A";

    if (rotation.length !== 1)
        return "A";

    return rotation;

};

Encoder.prototype.encodeMaterial = function(material) {

    return material || "";

};
/* ========================================================= */

window.Encoder = Encoder;
window.EncodeContext = EncodeContext;
/* ========================================================= */
/* VALIDATION                                                */
/* ========================================================= */

Encoder.prototype.validateWorld = function () {

    this.context.errors = [];

    const worldIDs = new Set();

    for (const component of this.context.components) {

        try {

            this.validate(component);

        } catch (err) {

            this.context.errors.push(err.message);

        }

        if (
            component.worldID &&
            worldIDs.has(component.worldID)
        ) {

            this.context.errors.push(
                "Duplicate World ID: " +
                component.worldID
            );

        }

        if (component.worldID)
            worldIDs.add(component.worldID);

    }

    return this.context.errors.length === 0;

};

/* ========================================================= */
/* STATISTICS                                                */
/* ========================================================= */

Encoder.prototype.getStatistics = function () {

    const stats = {

        components: this.context.components.length,

        byID: {},

        withCustomData: 0,

        withWorldID: 0,

        withWireData: 0,

        errors: this.context.errors.length

    };

    for (const c of this.context.components) {

        stats.byID[c.id] ??= 0;

        stats.byID[c.id]++;

        if (c.customData)
            stats.withCustomData++;

        if (c.worldID)
            stats.withWorldID++;

        if (c.wireData)
            stats.withWireData++;

    }

    return stats;

};

/* ========================================================= */
/* EXPORT HELPERS                                            */
/* ========================================================= */

Encoder.prototype.export = function () {

    return this.encode(

        this.context.components

    );

};

Encoder.prototype.setComponents = function (components) {

    this.context.components = components;

};

Encoder.prototype.getComponents = function () {

    return this.context.components;

};

/* ========================================================= */
/* STATIC API                                                */
/* ========================================================= */

Encoder.encode = function (

    components,

    registry = null

) {

    const ctx = new EncodeContext({

        registry

    });

    const encoder = new Encoder(ctx);

    return encoder.encode(components);

};

/* ========================================================= */
/* DEBUG HELPERS                                             */
/* ========================================================= */

Encoder.prototype.dump = function () {

    console.table(

        this.context.components.map(c => ({

            id: c.id,

            name: c.name,

            x: c.position.x,

            y: c.position.y,

            z: c.position.z,

            worldID: c.worldID,

            custom: !!c.customData,

            wires: !!c.wireData

        }))

    );

};

Encoder.prototype.cloneWorld = function () {

    return structuredClone(

        this.context.components

    );

};

/* ========================================================= */
/* VERSION                                                   */
/* ========================================================= */

Encoder.VERSION = "1.0.0";

/* ========================================================= */
/* EXPORTS                                                   */
/* ========================================================= */

window.Encoder = Encoder;
window.EncodeContext = EncodeContext;
