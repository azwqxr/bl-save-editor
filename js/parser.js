/*
why are you here -az
 */

"use strict";

class Component {

    constructor() {

        this.id = "";
        this.name = "";

        this.position = {
            x: 0,
            y: 0,
            z: 0
        };

        this.rotation = "A";

        this.color = {
            r: 255,
            g: 255,
            b: 255
        };

        this.material = "";

        // data after /
        this.customData = "";

        // data after =
        this.worldID = "";

        // data after ^
        this.wireData = "";

        // plugin-specific storage
        this.pluginData = {};

        // original string
        this.raw = "";

        // parsing errors
        this.errors = [];

    }

}

/* ========================================================= */

class ParseContext {

    constructor(options = {}) {

        this.items = options.items || {};

        this.registry = options.registry || null;

        this.strict = !!options.strict;

        this.components = [];

        this.errors = [];

    }

}

/* ========================================================= */

class Parser {

    constructor(context = new ParseContext()) {

        this.context = context;

        this.itemIDs = [];

        this.buildIDCache();

    }

    /* ===================================================== */

    buildIDCache() {

        this.itemIDs = [];

        for (const key in this.context.items) {

            const item = this.context.items[key];

            if (!item)
                continue;

            if (!item.id)
                continue;

            this.itemIDs.push(item.id);

        }

        this.itemIDs.sort((a, b) => {

            return b.length - a.length;

        });

    }

    /* ===================================================== */

    parse(saveString) {

        this.context.components = [];

        if (!saveString)
            return [];

        const blocks = this.splitSave(saveString);

        for (const raw of blocks) {

            const component = this.parseComponent(raw);

            this.context.components.push(component);

        }

        return this.context.components;

    }

    /* ===================================================== */

    splitSave(save) {

        return save
            .split(";")
            .map(x => x.trim())
            .filter(x => x.length);

    }

    /* ===================================================== */

    parseComponent(raw) {

        const component = new Component();

        component.raw = raw;

        let cursor = 0;

        //----------------------------------------------------
        // Determine component ID
        //----------------------------------------------------

        const result = this.readComponentID(raw, cursor);

        component.id = result.id;

        cursor += result.length;

        //----------------------------------------------------
        // Lookup item information
        //----------------------------------------------------

        const item = this.findItem(component.id);

        if (item) {

            component.name = item.name || "";

        } else {

            component.name = "Unknown";

            component.errors.push(
                "Unknown component ID: " + component.id
            );

        }

        //----------------------------------------------------
        // Store cursor for next parsing stage
        //----------------------------------------------------

        component._cursor = cursor;

        return component;

    }

    /* ===================================================== */

    findItem(id) {

        for (const key in this.context.items) {

            const item = this.context.items[key];

            if (item.id === id)
                return item;

        }

        return null;

    }

    /* ===================================================== */

    readComponentID(text, start = 0) {

        /*
         * Longest match wins.
         *
         * Example:
         *
         * #
         * #!
         * #d
         * #A
         *
         * Always pick the longest valid ID.
         */

        for (const id of this.itemIDs) {

            if (text.startsWith(id, start)) {

                return {

                    id,

                    length: id.length

                };

            }

        }

        /*
         * Fallback
         */

        return {

            id: text[start],

            length: 1

        };

    }

}

/* ===================================================== */
/* STATIC API                                            */
/* ===================================================== */

Parser.parse = function (

    saveString,

    items,

    registry = null

) {

    const ctx = new ParseContext({

        items,

        registry

    });

    const parser = new Parser(ctx);

    return parser.parse(saveString);

};

/* ========================================================= */

window.Parser = Parser;
window.ParseContext = ParseContext;
window.Component = Component;
    /* ===================================================== */

    parseComponent(raw) {

        const component = new Component();

        component.raw = raw;

        let cursor = 0;

        //----------------------------------------------------
        // Component ID
        //----------------------------------------------------

        const idResult = this.readComponentID(raw, cursor);

        component.id = idResult.id;

        cursor += idResult.length;

        const item = this.findItem(component.id);

        if (item) {

            component.name = item.name || "";

        } else {

            component.name = "Unknown";

            component.errors.push(
                "Unknown component ID: " + component.id
            );

        }

        //----------------------------------------------------
        // Fixed component data
        //----------------------------------------------------

        try {

            cursor = this.parseFixedData(
                component,
                raw,
                cursor
            );

        } catch (err) {

            component.errors.push(err.message);

        }

        component._cursor = cursor;

        return component;

    }

    /* ===================================================== */

    parseFixedData(component, raw, cursor) {

        //----------------------------------------------------
        // Position
        //----------------------------------------------------

        if (cursor + 4 > raw.length)
            throw new Error("Unexpected end while reading position.");

        const posString = raw.substring(
            cursor,
            cursor + 4
        );

        if (!Base71.isValidPositionString(posString))
            throw new Error("Invalid position string.");

        component.position =
            Base71.decodePosition(posString);

        cursor += 4;

        //----------------------------------------------------
        // Rotation
        //----------------------------------------------------

        if (cursor >= raw.length)
            throw new Error("Missing rotation.");

        component.rotation = raw[cursor];

        cursor++;

        //----------------------------------------------------
        // Color
        //----------------------------------------------------

        if (cursor + 4 > raw.length)
            throw new Error("Unexpected end while reading color.");

        const colorString = raw.substring(
            cursor,
            cursor + 4
        );

        if (!Base71.isValidColorString(colorString))
            throw new Error("Invalid color string.");

        component.color =
            Base71.decodeColor(colorString);

        cursor += 4;

        //----------------------------------------------------
        // Material
        //----------------------------------------------------

        component.material = "";

        if (cursor < raw.length) {

            const next = raw[cursor];

            if (
                next !== "/" &&
                next !== "=" &&
                next !== "^"
            ) {

                component.material = next;

                cursor++;

            }

        }

        return cursor;

    }

    /* ===================================================== */

    peek(raw, cursor) {

        if (cursor >= raw.length)
            return "";

        return raw[cursor];

    }

    /* ===================================================== */

    remaining(raw, cursor) {

        if (cursor >= raw.length)
            return "";

        return raw.substring(cursor);

    }

    /* ===================================================== */

    isDelimiter(ch) {

        return (
            ch === "/" ||
            ch === "=" ||
            ch === "^"
        );

    }

    /* ===================================================== */

    validateComponent(component) {

        if (!Base71.inGrid(
            component.position.x,
            component.position.y,
            component.position.z
        )) {

            component.errors.push(
                "Position outside build area."
            );

        }

        if (
            !Base71.isValidColorString(
                Base71.encodeColor(
                    component.color.r,
                    component.color.g,
                    component.color.b
                )
            )
        ) {

            component.errors.push(
                "Invalid RGB value."
            );

        }

    }
/* ===================================================== */
/* OPTIONAL DATA                                         */
/* ===================================================== */

parseOptionalData(component, raw, cursor) {

    while (cursor < raw.length) {

        const ch = raw[cursor];

        switch (ch) {

            case "/":
                cursor = this.parseCustomData(
                    component,
                    raw,
                    cursor
                );
                break;

            case "=":
                cursor = this.parseWorldID(
                    component,
                    raw,
                    cursor
                );
                break;

            case "^":
                cursor = this.parseWireData(
                    component,
                    raw,
                    cursor
                );
                break;

            default:

                component.errors.push(
                    "Unexpected character '" +
                    ch +
                    "' at position " +
                    cursor
                );

                cursor++;

        }

    }

    return cursor;

}

/* ===================================================== */

parseCustomData(component, raw, cursor) {

    cursor++;

    let end = raw.length;

    const eq = raw.indexOf("=", cursor);

    const wire = raw.indexOf("^", cursor);

    if (eq !== -1)
        end = Math.min(end, eq);

    if (wire !== -1)
        end = Math.min(end, wire);

    component.customData =
        raw.substring(cursor, end);

    return end;

}

/* ===================================================== */

parseWorldID(component, raw, cursor) {

    cursor++;

    let end = raw.length;

    const wire = raw.indexOf("^", cursor);

    if (wire !== -1)
        end = wire;

    component.worldID =
        raw.substring(cursor, end);

    return end;

}

/* ===================================================== */

parseWireData(component, raw, cursor) {

    component.wireData =
        raw.substring(cursor + 1);

    return raw.length;

}

/* ===================================================== */

runPlugin(component) {

    if (!this.context.registry)
        return;

    const plugin =
        this.context.registry.get(component.id);

    if (!plugin)
        return;

    if (typeof plugin.decode !== "function")
        return;

    try {

        plugin.decode(component);

    } catch (err) {

        component.errors.push(
            "Plugin error: " +
            err.message
        );

    }

}

/* ===================================================== */

finalizeComponent(component, raw, cursor) {

    cursor = this.parseOptionalData(
        component,
        raw,
        cursor
    );

    this.validateComponent(component);

    this.runPlugin(component);

return this.finalizeComponent(component, raw, cursor);

}
/* ===================================================== */
/* FIND HELPERS                                          */
/* ===================================================== */

findByWorldID(worldID) {

    return this.context.components.find(
        c => c.worldID === worldID
    ) || null;

}

findAllByID(id) {

    return this.context.components.filter(
        c => c.id === id
    );

}

findAt(x, y, z) {

    return this.context.components.find(c => {

        return (
            c.position.x === x &&
            c.position.y === y &&
            c.position.z === z
        );

    }) || null;

}

/* ===================================================== */
/* STATISTICS                                            */
/* ===================================================== */

getStatistics() {

    const stats = {

        total: this.context.components.length,

        byID: {},

        unknown: 0,

        warnings: 0

    };

    for (const c of this.context.components) {

        stats.byID[c.id] ??= 0;

        stats.byID[c.id]++;

        if (c.name === "Unknown")
            stats.unknown++;

        stats.warnings += c.errors.length;

    }

    return stats;

}

/* ===================================================== */
/* VALIDATION                                            */
/* ===================================================== */

validate() {

    const errors = [];

    const worldIDs = new Set();

    for (const c of this.context.components) {

        for (const e of c.errors)
            errors.push(e);

        if (c.worldID) {

            if (worldIDs.has(c.worldID)) {

                errors.push(
                    "Duplicate World ID: " +
                    c.worldID
                );

            }

            worldIDs.add(c.worldID);

        }

    }

    return errors;

}

/* ===================================================== */
/* LOSSLESS EXPORT                                       */
/* ===================================================== */

toJSON() {

    return JSON.stringify(

        this.context.components,

        null,

        2

    );

}

/* ===================================================== */

cloneComponent(component) {

    return structuredClone(component);

}

/* ===================================================== */

cloneWorld() {

    return structuredClone(

        this.context.components

    );

}
