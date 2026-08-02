/*
 * wire.js
 * Part 1 of 3
 *
 * Build Logic Save Editor
 */

"use strict";

/* ========================================================= */
/* Wire Types                                                 */
/* ========================================================= */

const WireType = Object.freeze({

    INTERNAL: "internal",

    EXTERNAL: "external"

});

/* ========================================================= */
/* Wire                                                       */
/* ========================================================= */

class Wire {

    constructor(options = {}) {

        this.type =
            options.type ||
            WireType.EXTERNAL;

        /* Component containing the INPUT node */

        this.fromWorldID =
            options.fromWorldID || "";

        this.fromConnector =
            options.fromConnector || "";

        /* Component containing the OUTPUT node */

        this.toWorldID =
            options.toWorldID || "";

        this.toConnector =
            options.toConnector || "";

    }

    clone() {

        return new Wire({

            type: this.type,

            fromWorldID: this.fromWorldID,

            fromConnector: this.fromConnector,

            toWorldID: this.toWorldID,

            toConnector: this.toConnector

        });

    }

}

/* ========================================================= */
/* Wire Collection                                            */
/* ========================================================= */

class WireCollection {

    constructor() {

        this.wires = [];

    }

    add(wire) {

        this.wires.push(wire);

        return wire;

    }

    remove(wire) {

        const i =
            this.wires.indexOf(wire);

        if (i !== -1)
            this.wires.splice(i,1);

    }

    clear() {

        this.wires.length = 0;

    }

    count() {

        return this.wires.length;

    }

    getAll() {

        return this.wires;

    }

}
/* ========================================================= */
/* Queries                                                    */
/* ========================================================= */

WireCollection.prototype.getIncoming = function(worldID) {

    return this.wires.filter(w =>

        w.fromWorldID === worldID

    );

};

WireCollection.prototype.getOutgoing = function(worldID) {

    return this.wires.filter(w =>

        w.toWorldID === worldID

    );

};

WireCollection.prototype.getConnected = function(worldID) {

    return this.wires.filter(w =>

        w.fromWorldID === worldID ||

        w.toWorldID === worldID

    );

};

WireCollection.prototype.find = function(

    fromWorldID,
    fromConnector,

    toWorldID,
    toConnector

) {

    return this.wires.find(w =>

        w.fromWorldID === fromWorldID &&

        w.fromConnector === fromConnector &&

        w.toWorldID === toWorldID &&

        w.toConnector === toConnector

    ) || null;

};

/* ========================================================= */
/* Serialization                                              */
/* ========================================================= */

Wire.prototype.toJSON = function() {

    return {

        type: this.type,

        fromWorldID: this.fromWorldID,

        fromConnector: this.fromConnector,

        toWorldID: this.toWorldID,

        toConnector: this.toConnector

    };

};

Wire.fromJSON = function(json) {

    return new Wire(json);

};

WireCollection.prototype.toJSON = function() {

    return this.wires.map(

        wire => wire.toJSON()

    );

};

WireCollection.fromJSON = function(list) {

    const collection =
        new WireCollection();

    for (const wire of list) {

        collection.add(

            Wire.fromJSON(wire)

        );

    }

    return collection;

};
/* ========================================================= */
/* Helpers                                                    */
/* ========================================================= */

Wire.prototype.isInternal = function() {

    return this.type === WireType.INTERNAL;

};

Wire.prototype.isExternal = function() {

    return this.type === WireType.EXTERNAL;

};

Wire.prototype.isLoop = function() {

    return (

        this.fromWorldID ===

        this.toWorldID

    );

};

Wire.prototype.equals = function(other) {

    return (

        this.type === other.type &&

        this.fromWorldID === other.fromWorldID &&

        this.fromConnector === other.fromConnector &&

        this.toWorldID === other.toWorldID &&

        this.toConnector === other.toConnector

    );

};

/* ========================================================= */
/* Version                                                    */
/* ========================================================= */

Wire.VERSION = "1.0.0";

window.Wire = Wire;
window.WireType = WireType;
window.WireCollection = WireCollection;
/* ========================================================= */
/* Build Logic Wire Parser                                   */
/* ========================================================= */

WireCollection.prototype.parseWireSection = function(section) {

    this.clear();

    if (!section || section.length === 0)
        return;

    if (section[0] !== "^")
        return;

    let i = 1;

    const firstInput = section[i++];
    const currentWorldID = section[i++];

    let firstType = section[i++];

    if (firstType === "_") {

        const outputConnector = section[i++];
        let worldID = "";

        while (
            i < section.length &&
            section[i] !== "." &&
            section[i] !== "*"
        ) {
            worldID += section[i++];
        }

        this.add(new Wire({

            type: WireType.EXTERNAL,

            fromWorldID: currentWorldID,
            fromConnector: firstInput,

            toWorldID: worldID.slice(0, -1),
            toConnector: worldID.slice(-1)

        }));

    }
    else if (firstType === "-") {

        const outputConnector = section[i++];

        this.add(new Wire({

            type: WireType.INTERNAL,

            fromWorldID: currentWorldID,
            fromConnector: firstInput,

            toWorldID: currentWorldID,
            toConnector: outputConnector

        }));

    }

    while (i < section.length) {

        const type = section[i++];

        if (type === ".") {

            const input = section[i++];

            let world = "";

            while (
                i < section.length &&
                section[i] !== "." &&
                section[i] !== "*"
            ) {

                world += section[i++];

            }

            this.add(new Wire({

                type: WireType.EXTERNAL,

                fromWorldID: currentWorldID,

                fromConnector: input,

                toWorldID: world.slice(0, -1),

                toConnector: world.slice(-1)

            }));

        }

        else if (type === "*") {

            const input = section[i++];

            const output = section[i++];

            this.add(new Wire({

                type: WireType.INTERNAL,

                fromWorldID: currentWorldID,

                fromConnector: input,

                toWorldID: currentWorldID,

                toConnector: output

            }));

        }

    }

};
/* ========================================================= */
/* Build Logic Wire Encoder                                  */
/* ========================================================= */

WireCollection.prototype.encodeWireSection = function(worldID) {

    const wires =
        this.getIncoming(worldID);

    if (wires.length === 0)
        return "";

    let out = "^";

    const first = wires[0];

    out += first.fromConnector;
    out += worldID;

    if (first.type === WireType.INTERNAL) {

        out += "-";
        out += first.toConnector;

    } else {

        out += "_";
        out += first.toConnector;
        out += first.toWorldID;

    }

    for (let i = 1; i < wires.length; i++) {

        const wire = wires[i];

        if (wire.type === WireType.INTERNAL) {

            out += "*";
            out += wire.fromConnector;
            out += wire.toConnector;

        }

        else {

            out += ".";
            out += wire.fromConnector;
            out += wire.toWorldID;
            out += wire.toConnector;

        }

    }

    return out;

};
/* ========================================================= */
/* Connection Management                                      */
/* ========================================================= */

WireCollection.prototype.connect = function(

    inputWorld,
    inputNode,

    outputWorld,
    outputNode

) {

    const type =
        inputWorld === outputWorld ?

        WireType.INTERNAL :

        WireType.EXTERNAL;

    if (this.find(

        inputWorld,
        inputNode,

        outputWorld,
        outputNode

    ))
        return null;

    const wire = new Wire({

        type,

        fromWorldID: inputWorld,

        fromConnector: inputNode,

        toWorldID: outputWorld,

        toConnector: outputNode

    });

    this.add(wire);

    return wire;

};

WireCollection.prototype.disconnect = function(

    inputWorld,
    inputNode,

    outputWorld,
    outputNode

) {

    const wire =
        this.find(

            inputWorld,
            inputNode,

            outputWorld,
            outputNode

        );

    if (!wire)
        return false;

    this.remove(wire);

    return true;

};
/* ========================================================= */
/* Validation                                                 */
/* ========================================================= */

WireCollection.prototype.validate = function() {

    const report = {

        duplicateConnections: [],

        invalidWorldIDs: [],

        invalidConnectors: []

    };

    const seen = new Set();

    for (const wire of this.wires) {

        const key =

            wire.fromWorldID + "|" +

            wire.fromConnector + "|" +

            wire.toWorldID + "|" +

            wire.toConnector;

        if (seen.has(key))
            report.duplicateConnections.push(wire);

        seen.add(key);

        if (!wire.fromWorldID)
            report.invalidWorldIDs.push(wire);

        if (!wire.toWorldID)
            report.invalidWorldIDs.push(wire);

        if (!wire.fromConnector)
            report.invalidConnectors.push(wire);

        if (!wire.toConnector)
            report.invalidConnectors.push(wire);

    }

    return report;

};
/* ========================================================= */
/* Wire Renderer                                              */
/* ========================================================= */

class WireRenderer {

    constructor(renderer, collection) {

        this.renderer = renderer;
        this.collection = collection;

        this.hitRadius = 8;
        this.selectedWire = null;

    }

    draw() {

        const ctx = this.renderer.ctx;

        ctx.save();

        ctx.lineWidth = 2;

        for (const wire of this.collection.getAll()) {

            const a = this.getConnectorPosition(
                wire.fromWorldID,
                wire.fromConnector
            );

            const b = this.getConnectorPosition(
                wire.toWorldID,
                wire.toConnector
            );

            if (!a || !b)
                continue;

            ctx.strokeStyle =
                wire === this.selectedWire
                    ? "#00ff00"
                    : (
                        wire.type === WireType.INTERNAL
                        ? "#ffaa00"
                        : "#00aaff"
                    );

            ctx.beginPath();

            const mid =
                (a.x + b.x) / 2;

            ctx.moveTo(a.x, a.y);

            ctx.bezierCurveTo(

                mid,
                a.y,

                mid,
                b.y,

                b.x,
                b.y

            );

            ctx.stroke();

        }

        ctx.restore();

    }

    getConnectorPosition(worldID, connector) {

        if (!this.renderer.world)
            return null;

        const component =
            this.renderer.world.findByWorldID(worldID);

        if (!component)
            return null;

        const plugin =
            window.Registry?.get(component.id);

        if (!plugin)
            return null;

        if (!plugin.connectors)
            return null;

        const node =
            plugin.connectors[connector];

        if (!node)
            return null;

        const p =
            this.renderer.worldToScreen(

                component.position.x,
                component.position.z

            );

        return {

            x: p.x + node.x,

            y: p.y + node.y

        };

    }

}

/* ========================================================= */
/* Wire Hit Testing                                           */
/* ========================================================= */

WireRenderer.prototype.pick = function(x, y) {

    for (const wire of this.collection.getAll()) {

        const a =
            this.getConnectorPosition(
                wire.fromWorldID,
                wire.fromConnector
            );

        const b =
            this.getConnectorPosition(
                wire.toWorldID,
                wire.toConnector
            );

        if (!a || !b)
            continue;

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;

        const dx = mx - x;
        const dy = my - y;

        if (
            dx * dx + dy * dy <
            this.hitRadius * this.hitRadius
        ) {

            return wire;

        }

    }

    return null;

};

/* ========================================================= */
/* Graph Traversal                                            */
/* ========================================================= */

WireCollection.prototype.follow = function(startWorldID) {

    const visited = new Set();
    const queue = [startWorldID];

    while (queue.length) {

        const id = queue.shift();

        if (visited.has(id))
            continue;

        visited.add(id);

        for (const wire of this.getConnected(id)) {

            if (!visited.has(wire.fromWorldID))
                queue.push(wire.fromWorldID);

            if (!visited.has(wire.toWorldID))
                queue.push(wire.toWorldID);

        }

    }

    return [...visited];

};

/* ========================================================= */
/* Delete All Connections                                     */
/* ========================================================= */

WireCollection.prototype.removeComponent = function(worldID) {

    this.wires = this.wires.filter(w =>

        w.fromWorldID !== worldID &&
        w.toWorldID !== worldID

    );

};

/* ========================================================= */
/* Auto Update IDs                                            */
/* ========================================================= */

WireCollection.prototype.renameWorldID = function(oldID, newID) {

    for (const wire of this.wires) {

        if (wire.fromWorldID === oldID)
            wire.fromWorldID = newID;

        if (wire.toWorldID === oldID)
            wire.toWorldID = newID;

    }

};

/* ========================================================= */
/* Connector Queries                                          */
/* ========================================================= */

WireCollection.prototype.getInputConnections = function(worldID, connector) {

    return this.wires.filter(w =>

        w.fromWorldID === worldID &&
        w.fromConnector === connector

    );

};

WireCollection.prototype.getOutputConnections = function(worldID, connector) {

    return this.wires.filter(w =>

        w.toWorldID === worldID &&
        w.toConnector === connector

    );

};

/* ========================================================= */
/* Live Wire Placement                                        */
/* ========================================================= */

WireRenderer.prototype.beginConnection = function(worldID, connector) {

    this.dragConnection = {

        worldID,
        connector,

        x: 0,
        y: 0

    };

};

WireRenderer.prototype.updateConnection = function(x, y) {

    if (!this.dragConnection)
        return;

    this.dragConnection.x = x;
    this.dragConnection.y = y;

};

WireRenderer.prototype.cancelConnection = function() {

    this.dragConnection = null;

};

WireRenderer.prototype.finishConnection = function(

    worldID,
    connector

) {

    if (!this.dragConnection)
        return;

    this.collection.connect(

        worldID,
        connector,

        this.dragConnection.worldID,
        this.dragConnection.connector

    );

    this.dragConnection = null;

};

/* ========================================================= */
/* Draw Live Wire                                             */
/* ========================================================= */

WireRenderer.prototype.drawDrag = function() {

    if (!this.dragConnection)
        return;

    const ctx = this.renderer.ctx;

    const start =
        this.getConnectorPosition(

            this.dragConnection.worldID,

            this.dragConnection.connector

        );

    if (!start)
        return;

    ctx.save();

    ctx.strokeStyle = "#00ff88";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(start.x, start.y);

    ctx.lineTo(

        this.dragConnection.x,

        this.dragConnection.y

    );

    ctx.stroke();

    ctx.restore();

};

/* ========================================================= */
/* Statistics                                                 */
/* ========================================================= */

WireCollection.prototype.statistics = function() {

    return {

        total: this.count(),

        internal:
            this.wires.filter(
                w => w.type === WireType.INTERNAL
            ).length,

        external:
            this.wires.filter(
                w => w.type === WireType.EXTERNAL
            ).length

    };

};

/* ========================================================= */
/* Version                                                    */
/* ========================================================= */

WireRenderer.VERSION = "1.0.0";

window.WireRenderer = WireRenderer;
