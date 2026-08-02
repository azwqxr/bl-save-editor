/*
go make a plugin -az
 */

"use strict";

/* ========================================================= */
/* Plugin Base Class                                         */
/* ========================================================= */

class Plugin {

    constructor() {

        this.id = "";

        this.name = "";

        this.version = "1.0.0";

        this.author = "";

        this.description = "";

    }

    //--------------------------------------------------------
    // Decode custom save data
    //--------------------------------------------------------

    decode(component) {

        // override

    }

    //--------------------------------------------------------
    // Encode custom save data
    //--------------------------------------------------------

    encode(component) {

        // override

    }

    //--------------------------------------------------------
    // Build inspector UI
    //--------------------------------------------------------

    inspector(component) {

        return [];

    }

    //--------------------------------------------------------
    // Draw overlay (future renderer)
    //--------------------------------------------------------

    draw(ctx, component) {

    }

}

/* ========================================================= */
/* Plugin Registry                                           */
/* ========================================================= */

class PluginRegistry {

    constructor() {

        this.plugins = new Map();

    }

    /* ===================================================== */

    register(plugin) {

        if (!plugin)
            throw new Error(
                "Cannot register null plugin."
            );

        if (!(plugin instanceof Plugin))
            throw new Error(
                "Plugin must extend Plugin."
            );

        if (!plugin.id)
            throw new Error(
                "Plugin missing ID."
            );

        if (this.plugins.has(plugin.id))
            throw new Error(
                "Plugin already registered: " +
                plugin.id
            );

        this.plugins.set(

            plugin.id,

            plugin

        );

    }

    /* ===================================================== */

    unregister(id) {

        this.plugins.delete(id);

    }

    /* ===================================================== */

    has(id) {

        return this.plugins.has(id);

    }

    /* ===================================================== */

    get(id) {

        return this.plugins.get(id) || null;

    }

    /* ===================================================== */

    clear() {

        this.plugins.clear();

    }

    /* ===================================================== */

    count() {

        return this.plugins.size;

    }

    /* ===================================================== */

    list() {

        return Array.from(

            this.plugins.values()

        );

    }

    /* ===================================================== */

    listIDs() {

        return Array.from(

            this.plugins.keys()

        );

    }

    /* ===================================================== */

    decode(component) {

        const plugin = this.get(component.id);

        if (!plugin)
            return;

        plugin.decode(component);

    }

    /* ===================================================== */

    encode(component) {

        const plugin = this.get(component.id);

        if (!plugin)
            return;

        plugin.encode(component);

    }

    /* ===================================================== */

    inspector(component) {

        const plugin = this.get(component.id);

        if (!plugin)
            return [];

        return plugin.inspector(component);

    }

    /* ===================================================== */

    draw(ctx, component) {

        const plugin = this.get(component.id);

        if (!plugin)
            return;

        plugin.draw(ctx, component);

    }

}

/* ========================================================= */
/* Singleton Registry                                         */
/* ========================================================= */

const Registry = new PluginRegistry();
/* ========================================================= */
/* Convenience Registration                                  */
/* ========================================================= */

PluginRegistry.prototype.registerMany = function(list) {

    if (!Array.isArray(list))
        return;

    for (const plugin of list)
        this.register(plugin);

};

/* ========================================================= */

PluginRegistry.prototype.findByName = function(name) {

    for (const plugin of this.plugins.values()) {

        if (plugin.name === name)
            return plugin;

    }

    return null;

};

/* ========================================================= */

PluginRegistry.prototype.forEach = function(callback) {

    this.plugins.forEach(callback);

};

/* ========================================================= */

PluginRegistry.prototype.toJSON = function() {

    return this.list().map(plugin => ({

        id: plugin.id,

        name: plugin.name,

        version: plugin.version,

        author: plugin.author,

        description: plugin.description

    }));

};

/* ========================================================= */

window.Plugin = Plugin;
window.PluginRegistry = PluginRegistry;
window.Registry = Registry;
/* ========================================================= */
/* Validation                                                 */
/* ========================================================= */

PluginRegistry.prototype.validatePlugin = function(plugin) {

    const errors = [];

    if (!(plugin instanceof Plugin))
        errors.push("Must extend Plugin.");

    if (!plugin.id)
        errors.push("Missing component ID.");

    if (!plugin.name)
        errors.push("Missing plugin name.");

    if (typeof plugin.decode !== "function")
        errors.push("decode() missing.");

    if (typeof plugin.encode !== "function")
        errors.push("encode() missing.");

    if (typeof plugin.inspector !== "function")
        errors.push("inspector() missing.");

    if (typeof plugin.draw !== "function")
        errors.push("draw() missing.");

    return errors;

};

/* ========================================================= */
/* Lifecycle                                                  */
/* ========================================================= */

Plugin.prototype.onRegister = function() {};

Plugin.prototype.onUnregister = function() {};

Plugin.prototype.onLoad = function(component) {};

Plugin.prototype.onSave = function(component) {};

Plugin.prototype.onInspectorOpen = function(component) {};

Plugin.prototype.onInspectorClose = function(component) {};

/* ========================================================= */
/* Safe Registration                                          */
/* ========================================================= */

PluginRegistry.prototype.registerSafe = function(plugin) {

    const errors = this.validatePlugin(plugin);

    if (errors.length)
        throw new Error(errors.join("\n"));

    this.register(plugin);

    plugin.onRegister();

};

/* ========================================================= */
/* Freeze Registry                                             */
/* ========================================================= */

PluginRegistry.prototype.freeze = function() {

    this._locked = true;

};

PluginRegistry.prototype.unfreeze = function() {

    this._locked = false;

};

const _oldRegister = PluginRegistry.prototype.register;

PluginRegistry.prototype.register = function(plugin) {

    if (this._locked)
        throw new Error("Registry is locked.");

    _oldRegister.call(this, plugin);

};

/* ========================================================= */
/* Inspector Schema Helpers                                   */
/* ========================================================= */

Plugin.field = {

    text(name, label, value = "") {

        return {
            type: "text",
            name,
            label,
            value
        };

    },

    number(name, label, value = 0) {

        return {
            type: "number",
            name,
            label,
            value
        };

    },

    checkbox(name, label, value = false) {

        return {
            type: "checkbox",
            name,
            label,
            value
        };

    },

    dropdown(name, label, options = [], value = null) {

        return {
            type: "dropdown",
            name,
            label,
            options,
            value
        };

    },

    textarea(name, label, value = "") {

        return {
            type: "textarea",
            name,
            label,
            value
        };

    },

    color(name, label, value = "#ffffff") {

        return {
            type: "color",
            name,
            label,
            value
        };

    }

};

/* ========================================================= */
/* Metadata                                                    */
/* ========================================================= */

Plugin.prototype.metadata = function() {

    return {

        id: this.id,

        name: this.name,

        version: this.version,

        author: this.author,

        description: this.description

    };

};

/* ========================================================= */
/* Plugin Discovery                                            */
/* ========================================================= */

PluginRegistry.prototype.dump = function() {

    console.table(

        this.list().map(plugin => ({

            id: plugin.id,

            name: plugin.name,

            version: plugin.version,

            author: plugin.author

        }))

    );

};

/* ========================================================= */
/* Compatibility                                               */
/* ========================================================= */

Plugin.prototype.compatible = function(component) {

    return component.id === this.id;

};

/* ========================================================= */
/* Automatic Dispatch                                          */
/* ========================================================= */

PluginRegistry.prototype.decodeAll = function(components) {

    for (const component of components)
        this.decode(component);

};

PluginRegistry.prototype.encodeAll = function(components) {

    for (const component of components)
        this.encode(component);

};

/* ========================================================= */
/* Version                                                     */
/* ========================================================= */

PluginRegistry.VERSION = "1.0.0";
