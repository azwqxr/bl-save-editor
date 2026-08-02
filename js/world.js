/*
 * world.js
 * Part 1 of 3
 *
 * Build Logic Save Editor
 *
 * Central world model.
 */

"use strict";

class World {

    constructor() {

        this.components = [];

        this.name = "Untitled";

        this.author = "";

        this.modified = false;

        this.metadata = {};

    }

    /* ===================================================== */
    /* Component Management                                  */
    /* ===================================================== */

    add(component) {

        this.components.push(component);

        this.modified = true;

        return component;

    }

    addMany(list) {

        for (const component of list)
            this.add(component);

    }

    remove(component) {

        const index =
            this.components.indexOf(component);

        if (index === -1)
            return false;

        this.components.splice(index, 1);

        this.modified = true;

        return true;

    }

    clear() {

        this.components.length = 0;

        this.modified = true;

    }

    count() {

        return this.components.length;

    }

    getAll() {

        return this.components;

    }

    /* ===================================================== */
    /* Searching                                              */
    /* ===================================================== */

    findByWorldID(id) {

        return this.components.find(c =>
            c.worldID === id
        ) || null;

    }

    findByPosition(x, y, z) {

        return this.components.find(c =>

            c.position.x === x &&

            c.position.y === y &&

            c.position.z === z

        ) || null;

    }

    findAllByType(id) {

        return this.components.filter(c =>
            c.id === id
        );

    }

    /* ===================================================== */
    /* Iteration                                              */
    /* ===================================================== */

    forEach(callback) {

        this.components.forEach(callback);

    }

    map(callback) {

        return this.components.map(callback);

    }

    filter(callback) {

        return this.components.filter(callback);

    }

    /* ===================================================== */
    /* Bounding Box                                           */
    /* ===================================================== */

    getBounds() {

        if (this.components.length === 0) {

            return {

                minX: 0,
                minY: 0,
                minZ: 0,

                maxX: 0,
                maxY: 0,
                maxZ: 0

            };

        }

        const xs =
            this.components.map(c => c.position.x);

        const ys =
            this.components.map(c => c.position.y);

        const zs =
            this.components.map(c => c.position.z);

        return {

            minX: Math.min(...xs),
            maxX: Math.max(...xs),

            minY: Math.min(...ys),
            maxY: Math.max(...ys),

            minZ: Math.min(...zs),
            maxZ: Math.max(...zs)

        };

    }

    /* ===================================================== */
    /* Layers                                                 */
    /* ===================================================== */

    getLayer(y) {

        return this.components.filter(c =>
            c.position.y === y
        );

    }

    getLayers() {

        return [

            ...new Set(

                this.components.map(

                    c => c.position.y

                )

            )

        ].sort(

            (a, b) => a - b

        );

    }

    /* ===================================================== */
    /* Modification                                           */
    /* ===================================================== */

    markSaved() {

        this.modified = false;

    }

    isModified() {

        return this.modified;

    }

}
/* ========================================================= */
/* Clipboard                                                  */
/* ========================================================= */

World.prototype.clipboard = [];

World.prototype.copy = function(components) {

    this.clipboard = structuredClone(components);

};

World.prototype.cut = function(components) {

    this.copy(components);

    for (const component of components)
        this.remove(component);

};

World.prototype.paste = function(offset = { x: 1, y: 0, z: 1 }) {

    const pasted = [];

    for (const component of this.clipboard) {

        const clone = structuredClone(component);

        clone.position.x += offset.x;
        clone.position.y += offset.y;
        clone.position.z += offset.z;

        clone.worldID = this.generateWorldID();

        this.add(clone);

        pasted.push(clone);

    }

    return pasted;

};

/* ========================================================= */
/* Duplicate                                                  */
/* ========================================================= */

World.prototype.duplicate = function(components) {

    this.copy(components);

    return this.paste();

};

/* ========================================================= */
/* World ID Generation                                        */
/* ========================================================= */

World.prototype.usedWorldIDs = function() {

    const ids = new Set();

    for (const component of this.components) {

        if (component.worldID)
            ids.add(component.worldID);

    }

    return ids;

};

World.prototype.generateWorldID = function() {

    const alphabet =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@$%?&<()";

    const used =
        this.usedWorldIDs();

    let index = 0;

    while (true) {

        let id = "";

        let value = index;

        do {

            id =
                alphabet[value % alphabet.length] +
                id;

            value =
                Math.floor(value / alphabet.length);

        }

        while (value > 0);

        if (!used.has(id))
            return id;

        index++;

    }

};

/* ========================================================= */
/* Spatial Lookup                                             */
/* ========================================================= */

World.prototype.getAt = function(x, y, z) {

    return this.findByPosition(x, y, z);

};

World.prototype.hasAt = function(x, y, z) {

    return this.getAt(x, y, z) !== null;

};

World.prototype.getRegion = function(

    minX,
    minY,
    minZ,

    maxX,
    maxY,
    maxZ

) {

    return this.components.filter(component =>

        component.position.x >= minX &&
        component.position.x <= maxX &&

        component.position.y >= minY &&
        component.position.y <= maxY &&

        component.position.z >= minZ &&
        component.position.z <= maxZ

    );

};

/* ========================================================= */
/* Grid Helpers                                               */
/* ========================================================= */

World.prototype.snap = function(component) {

    component.position.x =
        Math.round(component.position.x);

    component.position.y =
        Math.round(component.position.y);

    component.position.z =
        Math.round(component.position.z);

};

World.prototype.snapAll = function() {

    for (const component of this.components)
        this.snap(component);

};

/* ========================================================= */
/* Movement                                                   */
/* ========================================================= */

World.prototype.move = function(

    component,

    dx,

    dy,

    dz

) {

    component.position.x += dx;
    component.position.y += dy;
    component.position.z += dz;

    this.modified = true;

};

World.prototype.moveMany = function(

    components,

    dx,

    dy,

    dz

) {

    for (const component of components) {

        this.move(

            component,

            dx,

            dy,

            dz

        );

    }

};

/* ========================================================= */
/* Collision                                                  */
/* ========================================================= */

World.prototype.collides = function(component) {

    return this.components.some(other => {

        if (other === component)
            return false;

        return (

            other.position.x === component.position.x &&

            other.position.y === component.position.y &&

            other.position.z === component.position.z

        );

    });

};

World.prototype.findCollisions = function() {

    const collisions = [];

    for (const component of this.components) {

        if (this.collides(component))
            collisions.push(component);

    }

    return collisions;

};
/* ========================================================= */
/* Undo / Redo                                                */
/* ========================================================= */

World.prototype.history = [];
World.prototype.future = [];

World.prototype.snapshot = function() {

    this.history.push(
        structuredClone(this.components)
    );

    if (this.history.length > 100)
        this.history.shift();

    this.future.length = 0;

};

World.prototype.undo = function() {

    if (this.history.length === 0)
        return false;

    this.future.push(
        structuredClone(this.components)
    );

    this.components = this.history.pop();

    this.modified = true;

    this.emit("worldChanged", this);

    return true;

};

World.prototype.redo = function() {

    if (this.future.length === 0)
        return false;

    this.history.push(
        structuredClone(this.components)
    );

    this.components = this.future.pop();

    this.modified = true;

    this.emit("worldChanged", this);

    return true;

};

/* ========================================================= */
/* Event System                                               */
/* ========================================================= */

World.prototype.listeners = {};

World.prototype.on = function(event, callback) {

    if (!this.listeners[event])
        this.listeners[event] = [];

    this.listeners[event].push(callback);

};

World.prototype.off = function(event, callback) {

    if (!this.listeners[event])
        return;

    this.listeners[event] =
        this.listeners[event].filter(
            fn => fn !== callback
        );

};

World.prototype.emit = function(event, data) {

    if (!this.listeners[event])
        return;

    for (const callback of this.listeners[event]) {

        callback(data);

    }

};

/* ========================================================= */
/* Save / Load                                                */
/* ========================================================= */

World.prototype.load = function(saveString) {

    if (!window.Parser)
        throw new Error("Parser not loaded.");

    this.components =
        Parser.parse(saveString);

    this.modified = false;

    this.emit("worldLoaded", this);

};

World.prototype.save = function() {

    if (!window.Encoder)
        throw new Error("Encoder not loaded.");

    return Encoder.encode(
        this.components
    );

};

/* ========================================================= */
/* Validation                                                 */
/* ========================================================= */

World.prototype.validate = function() {

    const report = {

        duplicateWorldIDs: [],

        duplicatePositions: [],

        invalidComponents: []

    };

    const ids = new Map();

    const positions = new Map();

    for (const component of this.components) {

        if (!component.id) {

            report.invalidComponents.push(
                component
            );

        }

        if (component.worldID) {

            if (ids.has(component.worldID)) {

                report.duplicateWorldIDs.push(
                    component.worldID
                );

            }

            ids.set(component.worldID, true);

        }

        const key =
            component.position.x + "," +
            component.position.y + "," +
            component.position.z;

        if (positions.has(key)) {

            report.duplicatePositions.push(key);

        }

        positions.set(key, true);

    }

    return report;

};

/* ========================================================= */
/* Auto Repair                                                */
/* ========================================================= */

World.prototype.repair = function() {

    const ids = new Set();

    for (const component of this.components) {

        if (
            !component.worldID ||
            ids.has(component.worldID)
        ) {

            component.worldID =
                this.generateWorldID();

        }

        ids.add(component.worldID);

        this.snap(component);

    }

    this.modified = true;

};

/* ========================================================= */
/* Plugin Hooks                                               */
/* ========================================================= */

World.prototype.notifyPlugins = function(event, component) {

    if (!window.Registry)
        return;

    const plugin =
        Registry.get(component.id);

    if (!plugin)
        return;

    if (typeof plugin[event] === "function") {

        plugin[event](

            component,

            this

        );

    }

};

World.prototype.componentAdded = function(component) {

    this.notifyPlugins(
        "onAdded",
        component
    );

};

World.prototype.componentRemoved = function(component) {

    this.notifyPlugins(
        "onRemoved",
        component
    );

};

World.prototype.componentChanged = function(component) {

    this.notifyPlugins(
        "onChanged",
        component
    );

};

/* ========================================================= */
/* Utilities                                                  */
/* ========================================================= */

World.prototype.center = function() {

    const b = this.getBounds();

    return {

        x: (b.minX + b.maxX) / 2,

        y: (b.minY + b.maxY) / 2,

        z: (b.minZ + b.maxZ) / 2

    };

};

World.prototype.clone = function() {

    const world = new World();

    world.components =
        structuredClone(
            this.components
        );

    world.name = this.name;

    world.author = this.author;

    world.metadata =
        structuredClone(
            this.metadata
        );

    world.modified = this.modified;

    return world;

};

World.prototype.toJSON = function() {

    return {

        name: this.name,

        author: this.author,

        metadata: this.metadata,

        components: this.components

    };

};

World.fromJSON = function(json) {

    const world = new World();

    world.name = json.name || "";

    world.author = json.author || "";

    world.metadata =
        json.metadata || {};

    world.components =
        json.components || [];

    return world;

};

/* ========================================================= */
/* Version                                                    */
/* ========================================================= */

World.VERSION = "2.0.0";
