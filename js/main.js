/*
 * ============================================================
go touch grass -az
 * ============================================================
 */

"use strict";


/* ============================================================
 * 1. APPLICATION INFORMATION
 * ============================================================
 */

const APP = Object.freeze({

    name: "Build Logic Save Editor",

    shortName: "BL Save Editor",

    version: "1.0.0",

    build: "2026.08.08",

    cacheVersion: "blse-1",

    debug:
        window.localStorage.getItem(
            "blse.debug"
        ) === "true"

});


/* ============================================================
 * 2. GLOBAL EDITOR STATE
 * ============================================================
 */

const EditorState = {

    /* --------------------------------------------------------
     * Application
     * --------------------------------------------------------
     */

    initialized: false,

    ready: false,

    loading: false,

    error: null,


    /* --------------------------------------------------------
     * Current file
     * --------------------------------------------------------
     */

    file: {

        name: null,

        path: null,

        type: null,

        size: 0,

        lastModified: null

    },


    /* --------------------------------------------------------
     * Save state
     * --------------------------------------------------------
     */

    dirty: false,

    savedAt: null,

    lastSaveHash: null,


    /* --------------------------------------------------------
     * Editor mode
     * --------------------------------------------------------
     */

    mode: "select",

    view: "world",


    /* --------------------------------------------------------
     * Selection
     * --------------------------------------------------------
     */

    selection: {

        objects: [],

        wires: [],

        primary: null

    },


    /* --------------------------------------------------------
     * World
     * --------------------------------------------------------
     */

    world: null,


    /* --------------------------------------------------------
     * History
     * --------------------------------------------------------
     */

    history: {

        undo: [],

        redo: [],

        maxEntries: 100,

        transaction: null

    },


    /* --------------------------------------------------------
     * Plugins
     * --------------------------------------------------------
     */

    plugins: new Map(),


    /* --------------------------------------------------------
     * Registered modules
     * --------------------------------------------------------
     */

    modules: new Map(),


    /* --------------------------------------------------------
     * Runtime
     * --------------------------------------------------------
     */

    runtime: {

        parser: null,

        encoder: null,

        renderer: null,

        world: null,

        wire: null,

        inspector: null,

        items: null

    }

};


/* ============================================================
 * 3. GLOBAL EVENT BUS
 * ============================================================
 *
 * Components communicate through this instead of directly
 * depending on each other wherever possible.
 *
 * Example:
 *
 * EventBus.on("world:changed", handler);
 *
 * EventBus.emit("world:changed", {
 *     object: object
 * });
 *
 * ============================================================
 */

const EventBus = {

    events: new Map(),


    on(name, callback) {

        if (
            typeof callback !== "function"
        ) {

            throw new TypeError(
                "EventBus.on callback must be a function."
            );

        }


        if (!this.events.has(name)) {

            this.events.set(
                name,
                new Set()
            );

        }


        const listeners =
            this.events.get(name);

        listeners.add(callback);


        return () => {

            listeners.delete(callback);

        };

    },


    once(name, callback) {

        const unsubscribe =
            this.on(
                name,
                (...args) => {

                    unsubscribe();

                    callback(...args);

                }
            );


        return unsubscribe;

    },


    off(name, callback) {

        const listeners =
            this.events.get(name);

        if (!listeners) {

            return;

        }


        listeners.delete(callback);


        if (
            listeners.size === 0
        ) {

            this.events.delete(name);

        }

    },


    emit(name, ...args) {

        const listeners =
            this.events.get(name);

        if (!listeners) {

            return;

        }


        for (
            const callback
            of [...listeners]
        ) {

            try {

                callback(...args);

            } catch (error) {

                console.error(
                    `[EventBus] Error in "${name}" listener:`,
                    error
                );

            }

        }

    },


    clear(name = null) {

        if (name === null) {

            this.events.clear();

            return;

        }


        this.events.delete(name);

    }

};


/* ============================================================
 * 4. DOM HELPERS
 * ============================================================
 */

const DOM = {

    get(selector, parent = document) {

        return parent.querySelector(selector);

    },


    getAll(selector, parent = document) {

        return [
            ...parent.querySelectorAll(selector)
        ];

    },


    byId(id) {

        return document.getElementById(id);

    },


    create(
        tag,
        options = {}
    ) {

        const element =
            document.createElement(tag);


        if (options.className) {

            element.className =
                options.className;

        }


        if (options.id) {

            element.id =
                options.id;

        }


        if (options.text !== undefined) {

            element.textContent =
                options.text;

        }


        if (options.html !== undefined) {

            element.innerHTML =
                options.html;

        }


        if (options.attributes) {

            for (
                const [key, value]
                of Object.entries(
                    options.attributes
                )
            ) {

                element.setAttribute(
                    key,
                    value
                );

            }

        }


        if (options.dataset) {

            for (
                const [key, value]
                of Object.entries(
                    options.dataset
                )
            ) {

                element.dataset[key] =
                    value;

            }

        }


        return element;

    },


    show(element) {

        if (!element) {

            return;

        }


        element.classList.remove(
            "hidden"
        );

    },


    hide(element) {

        if (!element) {

            return;

        }


        element.classList.add(
            "hidden"
        );

    },


    toggle(
        element,
        visible
    ) {

        if (!element) {

            return;

        }


        element.classList.toggle(
            "hidden",
            !visible
        );

    },


    setText(
        element,
        text
    ) {

        if (!element) {

            return;

        }


        element.textContent =
            text ?? "";

    }

};


/* ============================================================
 * 5. LOGGER
 * ============================================================
 */

const Logger = {

    prefix: "[BLSE]",


    log(...args) {

        if (APP.debug) {

            console.log(
                this.prefix,
                ...args
            );

        }

    },


    info(...args) {

        console.info(
            this.prefix,
            ...args
        );

    },


    warn(...args) {

        console.warn(
            this.prefix,
            ...args
        );

    },


    error(...args) {

        console.error(
            this.prefix,
            ...args
        );

    }

};


/* ============================================================
 * 6. MODULE REGISTRY
 * ============================================================
 *
 * Other JavaScript files can register themselves without
 * requiring main.js to know their implementation details.
 *
 * Example:
 *
 * Editor.registerModule("parser", parserAPI);
 *
 * ============================================================
 */

const Editor = {

    registerModule(
        name,
        module
    ) {

        if (
            !name ||
            typeof name !== "string"
        ) {

            throw new TypeError(
                "Module name must be a string."
            );

        }


        if (
            !module ||
            typeof module !== "object"
        ) {

            throw new TypeError(
                `Module "${name}" must be an object.`
            );

        }


        if (
            EditorState.modules.has(name)
        ) {

            Logger.warn(
                `Replacing module: ${name}`
            );

        }


        EditorState.modules.set(
            name,
            module
        );


        EventBus.emit(
            "module:registered",
            name,
            module
        );


        Logger.log(
            `Module registered: ${name}`
        );


        return module;

    },


    getModule(name) {

        return EditorState.modules.get(
            name
        ) || null;

    },


    hasModule(name) {

        return EditorState.modules.has(
            name
        );

    },


    removeModule(name) {

        const removed =
            EditorState.modules.delete(
                name
            );


        if (removed) {

            EventBus.emit(
                "module:removed",
                name
            );

        }


        return removed;

    }

};


/* ============================================================
 * 7. RUNTIME COMPONENT REGISTRATION
 * ============================================================
 */

Editor.registerRuntime = function(
    name,
    instance
) {

    if (
        !(name in EditorState.runtime)
    ) {

        Logger.warn(
            `Unknown runtime component: ${name}`
        );

    }


    EditorState.runtime[name] =
        instance;


    EventBus.emit(
        "runtime:registered",
        name,
        instance
    );


    Logger.log(
        `Runtime registered: ${name}`
    );


    return instance;

};


Editor.getRuntime = function(name) {

    return EditorState.runtime[name]
        ?? null;

};


/* ============================================================
 * 8. PLUGIN REGISTRATION FOUNDATION
 * ============================================================
 *
 * plugin-manager.js can extend this later.
 *
 * A plugin should eventually look roughly like:
 *
 * Editor.registerPlugin({
 *
 *     id: "example",
 *
 *     name: "Example Plugin",
 *
 *     version: "1.0.0",
 *
 *     init(editor) {
 *
 *         ...
 *
 *     }
 *
 * });
 *
 * ============================================================
 */

Editor.registerPlugin = function(
    plugin
) {

    if (
        !plugin ||
        typeof plugin !== "object"
    ) {

        throw new TypeError(
            "Plugin must be an object."
        );

    }


    if (
        !plugin.id ||
        typeof plugin.id !== "string"
    ) {

        throw new Error(
            "Plugin requires a string id."
        );

    }


    if (
        EditorState.plugins.has(
            plugin.id
        )
    ) {

        throw new Error(
            `Plugin already registered: ${plugin.id}`
        );

    }


    const record = {

        ...plugin,

        enabled: false,

        loaded: false,

        error: null,

        registeredAt:
            Date.now()

    };


    EditorState.plugins.set(
        plugin.id,
        record
    );


    EventBus.emit(
        "plugin:registered",
        record
    );


    Logger.log(
        `Plugin registered: ${plugin.id}`
    );


    return record;

};


/* ============================================================
 * 9. DIRTY STATE
 * ============================================================
 */

Editor.setDirty = function(
    dirty = true
) {

    dirty = Boolean(dirty);


    if (
        EditorState.dirty === dirty
    ) {

        return;

    }


    EditorState.dirty =
        dirty;


    EventBus.emit(
        "save:dirty",
        dirty
    );


    this.updateSaveIndicator();

};


Editor.markSaved = function(
    hash = null
) {

    EditorState.dirty =
        false;

    EditorState.savedAt =
        Date.now();

    EditorState.lastSaveHash =
        hash;


    EventBus.emit(
        "save:saved",
        {

            hash,

            timestamp:
                EditorState.savedAt

        }
    );


    this.updateSaveIndicator();

};


Editor.updateSaveIndicator = function() {

    const indicator =
        DOM.get(
            ".save-state"
        );


    if (!indicator) {

        return;

    }


    indicator.classList.toggle(
        "saved",
        !EditorState.dirty
    );


    indicator.classList.toggle(
        "unsaved",
        EditorState.dirty
    );


    const text =
        indicator.querySelector(
            ".save-state-text"
        );


    if (text) {

        text.textContent =
            EditorState.dirty
                ? "Unsaved changes"
                : "Saved";

    }

};


/* ============================================================
 * 10. SELECTION
 * ============================================================
 */

Editor.clearSelection = function() {

    EditorState.selection.objects =
        [];

    EditorState.selection.wires =
        [];

    EditorState.selection.primary =
        null;


    EventBus.emit(
        "selection:changed",
        EditorState.selection
    );

};


Editor.select = function(
    object,
    options = {}
) {

    const {

        additive = false,

        type = "object"

    } = options;


    if (!additive) {

        Editor.clearSelection();

    }


    if (
        type === "wire"
    ) {

        if (
            !EditorState.selection.wires
                .includes(object)
        ) {

            EditorState.selection.wires
                .push(object);

        }

    } else {

        if (
            !EditorState.selection.objects
                .includes(object)
        ) {

            EditorState.selection.objects
                .push(object);

        }

    }


    EditorState.selection.primary =
        object;


    EventBus.emit(
        "selection:changed",
        EditorState.selection
    );

};


/* ============================================================
 * 11. HISTORY
 * ============================================================
 */

Editor.pushHistory = function(
    entry
) {

    if (!entry) {

        return;

    }


    const history =
        EditorState.history;


    if (
        history.undo.length >=
        history.maxEntries
    ) {

        history.undo.shift();

    }


    history.undo.push(
        entry
    );


    history.redo =
        [];


    EventBus.emit(
        "history:changed",
        history
    );

};


Editor.canUndo = function() {

    return (
        EditorState.history.undo.length > 0
    );

};


Editor.canRedo = function() {

    return (
        EditorState.history.redo.length > 0
    );

};


/* ============================================================
 * 12. APPLICATION ERROR HANDLING
 * ============================================================
 */

Editor.setError = function(
    error
) {

    EditorState.error =
        error;


    Logger.error(
        error
    );


    EventBus.emit(
        "app:error",
        error
    );

};


Editor.clearError = function() {

    EditorState.error =
        null;


    EventBus.emit(
        "app:error:cleared"
    );

};


/* ============================================================
 * 13. INITIAL DOM REFERENCES
 * ============================================================
 */

const AppDOM = {

    app: null,

    loading: null,

    statusBar: null,

    world: null,

    inspector: null,

    pluginManager: null,


    initialize() {

        this.app =
            DOM.byId("app");

        this.loading =
            DOM.get(".app-loading");

        this.statusBar =
            DOM.byId("status-bar");

        this.world =
            DOM.byId("world-editor");

        this.inspector =
            DOM.byId("inspector");

        this.pluginManager =
            DOM.byId("plugin-manager");


        Logger.log(
            "DOM references initialized."
        );

    }

};


/* ============================================================
 * 14. APPLICATION STATUS
 * ============================================================
 */

Editor.setStatus = function(
    message,
    type = "normal"
) {

    const status =
        DOM.get(
            "#status-bar .status-message"
        );


    if (!status) {

        return;

    }


    status.textContent =
        message || "";


    status.classList.remove(
        "status-success",
        "status-warning",
        "status-error",
        "status-accent"
    );


    if (
        type !== "normal"
    ) {

        status.classList.add(
            `status-${type}`
        );

    }


    EventBus.emit(
        "status:changed",
        message,
        type
    );

};


/* ============================================================
 * 15. APPLICATION READY
 * ============================================================
 */

Editor.setReady = function() {

    EditorState.ready =
        true;

    EditorState.loading =
        false;


    if (
        AppDOM.loading
    ) {

        AppDOM.loading.classList.add(
            "hidden"
        );

    }


    if (
        AppDOM.app
    ) {

        AppDOM.app.classList.add(
            "app-ready"
        );

    }


    EventBus.emit(
        "app:ready"
    );


    Logger.info(
        `${APP.name} ${APP.version} ready.`
    );

};


/* ============================================================
 * 16. BASIC KEYBOARD HANDLERS
 * ============================================================
 */

function handleGlobalKeydown(event) {

    const key =
        event.key.toLowerCase();


    /* --------------------------------------------------------
     * Save
     * --------------------------------------------------------
     */

    if (
        (event.ctrlKey || event.metaKey) &&
        key === "s"
    ) {

        event.preventDefault();

        EventBus.emit(
            "command:save"
        );

        return;

    }


    /* --------------------------------------------------------
     * Open
     * --------------------------------------------------------
     */

    if (
        (event.ctrlKey || event.metaKey) &&
        key === "o"
    ) {

        event.preventDefault();

        EventBus.emit(
            "command:open"
        );

        return;

    }


    /* --------------------------------------------------------
     * Undo
     * --------------------------------------------------------
     */

    if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        key === "z"
    ) {

        event.preventDefault();

        EventBus.emit(
            "command:undo"
        );

        return;

    }


    /* --------------------------------------------------------
     * Redo
     * --------------------------------------------------------
     */

    if (
        (event.ctrlKey || event.metaKey) &&
        (
            key === "y" ||
            (
                event.shiftKey &&
                key === "z"
            )
        )
    ) {

        event.preventDefault();

        EventBus.emit(
            "command:redo"
        );

        return;

    }


    /* --------------------------------------------------------
     * Escape
     * --------------------------------------------------------
     */

    if (
        key === "escape"
    ) {

        EventBus.emit(
            "command:escape"
        );

    }

}


/* ============================================================
 * 17. BASIC COMMAND CONNECTIONS
 * ============================================================
 */

function initializeCommands() {

    EventBus.on(
        "command:undo",
        () => {

            if (
                Editor.canUndo()
            ) {

                EventBus.emit(
                    "history:undo"
                );

            }

        }
    );


    EventBus.on(
        "command:redo",
        () => {

            if (
                Editor.canRedo()
            ) {

                EventBus.emit(
                    "history:redo"
                );

            }

        }
    );


    EventBus.on(
        "command:escape",
        () => {

            Editor.clearSelection();

        }
    );


    Logger.log(
        "Commands initialized."
    );

}


/* ============================================================
 * 18. CORE INITIALIZATION
 * ============================================================
 */

function initializeCore() {

    if (
        EditorState.initialized
    ) {

        return;

    }


    EditorState.loading =
        true;


    AppDOM.initialize();

    initializeCommands();


    document.addEventListener(
        "keydown",
        handleGlobalKeydown
    );


    EditorState.initialized =
        true;


    Editor.setStatus(
        "Initializing editor...",
        "accent"
    );


    Logger.info(
        "Core initialized."
    );

}


/* ============================================================
 * 19. DOM READY
 * ============================================================
 */

function bootstrap() {

    try {

        initializeCore();


        /*
         * Other files will hook into the application here
         * through EventBus and Editor.registerModule().
         *
         * Parts 2–4 will expand this bootstrap process.
         */


        Editor.setStatus(
            "Waiting for editor modules...",
            "accent"
        );


    } catch (error) {

        Editor.setError(
            error
        );

    }

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        bootstrap,
        {
            once: true
        }
    );

} else {

    bootstrap();

}


/* ============================================================
 * 20. GLOBAL API
 * ============================================================
 *
 * Expose only the intentional public interfaces.
 *
 * This lets plugin files use:
 *
 *     window.BLSE.Editor
 *     window.BLSE.EventBus
 *     window.BLSE.State
 *
 * without requiring ES modules.
 *
 * ============================================================
 */

window.BLSE = {

    APP,

    Editor,

    EventBus,

    DOM,

    Logger,

    State: EditorState,

    AppDOM

};




/* ============================================================
 * 21. FILE MANAGER
 * ============================================================
 */

const FileManager = {

    currentFile: null,

    input: null,


    initialize() {

        this.input =
            DOM.byId("file-input");


        if (!this.input) {

            this.input =
                DOM.get(
                    'input[type="file"]'
                );

        }


        if (this.input) {

            this.input.addEventListener(
                "change",
                event => {

                    const files =
                        event.target.files;

                    if (
                        files &&
                        files.length
                    ) {

                        this.open(
                            files[0]
                        );

                    }

                }
            );

        }


        EventBus.on(
            "command:open",
            () => {

                this.openDialog();

            }
        );


        EventBus.on(
            "command:save",
            () => {

                this.save();

            }
        );


        EventBus.on(
            "command:save-as",
            () => {

                this.saveAs();

            }
        );


        Logger.log(
            "File manager initialized."
        );

    },


    openDialog() {

        if (!this.input) {

            Logger.warn(
                "No file input element found."
            );

            return;

        }


        this.input.value =
            "";


        this.input.click();

    },


    async open(file) {

        if (!file) {

            return;

        }


        try {

            EditorState.loading =
                true;


            Editor.setStatus(
                `Opening ${file.name}...`,
                "accent"
            );


            const buffer =
                await file.arrayBuffer();


            const bytes =
                new Uint8Array(buffer);


            const fileInfo = {

                name: file.name,

                size: file.size,

                type: file.type ||
                    "application/octet-stream",

                lastModified:
                    file.lastModified,

                bytes

            };


            this.currentFile =
                fileInfo;


            EditorState.file =
                {

                    name: file.name,

                    path: null,

                    type:
                        fileInfo.type,

                    size:
                        file.size,

                    lastModified:
                        file.lastModified

                };


            /*
             * The parser is responsible for actually
             * interpreting the save format.
             */

            EventBus.emit(
                "file:opening",
                fileInfo
            );


            const parser =
                Editor.getRuntime(
                    "parser"
                );


            if (
                parser &&
                typeof parser.parse ===
                    "function"
            ) {

                const result =
                    await parser.parse(
                        bytes,
                        fileInfo
                    );


                EventBus.emit(
                    "file:parsed",
                    result,
                    fileInfo
                );

            } else {

                /*
                 * Keep the raw data available until
                 * parser.js is loaded.
                 */

                EventBus.emit(
                    "file:raw",
                    bytes,
                    fileInfo
                );

                Logger.warn(
                    "Parser not registered; raw file data retained."
                );

            }


            EditorState.history.undo =
                [];

            EditorState.history.redo =
                [];

            Editor.clearSelection();

            Editor.markSaved();


            EventBus.emit(
                "file:opened",
                fileInfo
            );


            Editor.setStatus(
                `Opened ${file.name}`,
                "success"
            );


        } catch (error) {

            Editor.setError(
                error
            );


            Editor.setStatus(
                "Failed to open file.",
                "error"
            );


            EventBus.emit(
                "file:error",
                error
            );


        } finally {

            EditorState.loading =
                false;

        }

    },


    async save() {

        if (!this.currentFile) {

            return this.saveAs();

        }


        try {

            Editor.setStatus(
                "Encoding save...",
                "accent"
            );


            const encoder =
                Editor.getRuntime(
                    "encoder"
                );


            if (
                !encoder ||
                typeof encoder.encode !==
                    "function"
            ) {

                throw new Error(
                    "Encoder is not available."
                );

            }


            const result =
                await encoder.encode(
                    EditorState.world
                );


            if (!result) {

                throw new Error(
                    "Encoder returned no data."
                );

            }


            const blob =
                result instanceof Blob

                    ? result

                    : new Blob(
                        [result],
                        {
                            type:
                                this.currentFile
                                    .type ||
                                "application/octet-stream"
                        }
                    );


            this.downloadBlob(
                blob,
                this.currentFile.name
            );


            Editor.markSaved();


            Editor.setStatus(
                `Saved ${this.currentFile.name}`,
                "success"
            );


            EventBus.emit(
                "file:saved",
                blob,
                this.currentFile
            );


            return blob;

        } catch (error) {

            Editor.setError(
                error
            );


            Editor.setStatus(
                "Failed to save file.",
                "error"
            );


            EventBus.emit(
                "file:error",
                error
            );


            return null;

        }

    },


    async saveAs() {

        /*
         * A native Save File Picker is used when
         * available. A download fallback is provided
         * for browsers that don't support it.
         */

        try {

            const encoder =
                Editor.getRuntime(
                    "encoder"
                );


            if (
                !encoder ||
                typeof encoder.encode !==
                    "function"
            ) {

                throw new Error(
                    "Encoder is not available."
                );

            }


            const result =
                await encoder.encode(
                    EditorState.world
                );


            const blob =
                result instanceof Blob

                    ? result

                    : new Blob(
                        [result],
                        {
                            type:
                                "application/octet-stream"
                        }
                    );


            const suggestedName =
                this.currentFile?.name ||
                "save.bl";


            if (
                typeof window.showSaveFilePicker ===
                "function"
            ) {

                const handle =
                    await window.showSaveFilePicker({

                        suggestedName,

                        types: [

                            {

                                description:
                                    "Build Logic Save",

                                accept: {

                                    "application/octet-stream":
                                        [
                                            ".bl",
                                            ".json",
                                            ".save"
                                        ]

                                }

                            }

                        ]

                    });


                const writable =
                    await handle.createWritable();


                await writable.write(
                    blob
                );


                await writable.close();


                this.currentFile = {

                    name:
                        handle.name,

                    size:
                        blob.size,

                    type:
                        blob.type,

                    lastModified:
                        Date.now()

                };


                EditorState.file = {

                    name:
                        handle.name,

                    path: null,

                    type:
                        blob.type,

                    size:
                        blob.size,

                    lastModified:
                        Date.now()

                };


                Editor.markSaved();


                EventBus.emit(
                    "file:saved",
                    blob,
                    this.currentFile
                );


                Editor.setStatus(
                    `Saved ${handle.name}`,
                    "success"
                );


                return blob;

            }


            /*
             * Browser fallback.
             */

            const name =
                prompt(
                    "Save file as:",
                    suggestedName
                );


            if (!name) {

                return null;

            }


            this.downloadBlob(
                blob,
                name
            );


            this.currentFile = {

                name,

                size:
                    blob.size,

                type:
                    blob.type,

                lastModified:
                    Date.now()

            };


            EditorState.file = {

                name,

                path: null,

                type:
                    blob.type,

                size:
                    blob.size,

                lastModified:
                    Date.now()

            };


            Editor.markSaved();


            Editor.setStatus(
                `Saved ${name}`,
                "success"
            );


            return blob;

        } catch (error) {

            if (
                error?.name ===
                "AbortError"
            ) {

                return null;

            }


            Editor.setError(
                error
            );


            Editor.setStatus(
                "Save failed.",
                "error"
            );


            return null;

        }

    },


    downloadBlob(
        blob,
        filename
    ) {

        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;

        link.download =
            filename;


        link.style.display =
            "none";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );

            },
            1000
        );

    }

};


/* ============================================================
 * 22. UNSAVED CHANGE PROTECTION
 * ============================================================
 */

function initializeUnloadProtection() {

    window.addEventListener(
        "beforeunload",
        event => {

            if (
                !EditorState.dirty
            ) {

                return;

            }


            event.preventDefault();

            event.returnValue =
                "";

        }
    );

}


/* ============================================================
 * 23. HISTORY EXECUTION
 * ============================================================
 */

function initializeHistory() {

    EventBus.on(
        "history:undo",
        () => {

            const history =
                EditorState.history;


            if (
                history.undo.length === 0
            ) {

                return;

            }


            const entry =
                history.undo.pop();


            try {

                if (
                    typeof entry.undo ===
                    "function"
                ) {

                    entry.undo();

                }


                history.redo.push(
                    entry
                );


                Editor.setDirty(
                    true
                );


                EventBus.emit(
                    "history:undone",
                    entry
                );


                EventBus.emit(
                    "history:changed",
                    history
                );

            } catch (error) {

                Logger.error(
                    "Undo failed:",
                    error
                );


                history.undo.push(
                    entry
                );

            }

        }
    );


    EventBus.on(
        "history:redo",
        () => {

            const history =
                EditorState.history;


            if (
                history.redo.length === 0
            ) {

                return;

            }


            const entry =
                history.redo.pop();


            try {

                if (
                    typeof entry.redo ===
                    "function"
                ) {

                    entry.redo();

                }


                history.undo.push(
                    entry
                );


                Editor.setDirty(
                    true
                );


                EventBus.emit(
                    "history:redone",
                    entry
                );


                EventBus.emit(
                    "history:changed",
                    history
                );

            } catch (error) {

                Logger.error(
                    "Redo failed:",
                    error
                );


                history.redo.push(
                    entry
                );

            }

        }
    );


    Logger.log(
        "History execution initialized."
    );

}


/* ============================================================
 * 24. HISTORY TRANSACTIONS
 * ============================================================
 */

Editor.beginTransaction = function(
    label = "Edit"
) {

    if (
        EditorState.history.transaction
    ) {

        Logger.warn(
            "History transaction already active."
        );

        return;

    }


    EditorState.history.transaction = {

        label,

        actions: [],

        startedAt:
            Date.now()

    };


    EventBus.emit(
        "history:transaction:start",
        EditorState.history.transaction
    );

};


Editor.addTransactionAction = function(
    action
) {

    const transaction =
        EditorState.history.transaction;


    if (!transaction) {

        Logger.warn(
            "No active history transaction."
        );

        return;

    }


    if (
        !action ||
        typeof action !== "object"
    ) {

        return;

    }


    transaction.actions.push(
        action
    );

};


Editor.commitTransaction = function() {

    const transaction =
        EditorState.history.transaction;


    if (!transaction) {

        return;

    }


    EditorState.history.transaction =
        null;


    if (
        transaction.actions.length === 0
    ) {

        return;

    }


    const entry = {

        label:
            transaction.label,

        actions:
            transaction.actions,

        undo() {

            for (
                let i =
                    this.actions.length - 1;
                i >= 0;
                i--
            ) {

                const action =
                    this.actions[i];


                if (
                    typeof action.undo ===
                    "function"
                ) {

                    action.undo();

                }

            }

        },


        redo() {

            for (
                const action
                of this.actions
            ) {

                if (
                    typeof action.redo ===
                    "function"
                ) {

                    action.redo();

                }

            }

        }

    };


    Editor.pushHistory(
        entry
    );


    Editor.setDirty(
        true
    );


    EventBus.emit(
        "history:transaction:commit",
        entry
    );

};


Editor.cancelTransaction = function() {

    const transaction =
        EditorState.history.transaction;


    if (!transaction) {

        return;

    }


    EditorState.history.transaction =
        null;


    EventBus.emit(
        "history:transaction:cancel",
        transaction
    );

};


/* ============================================================
 * 25. WORLD CHANGE BRIDGE
 * ============================================================
 */

function initializeWorldBridge() {

    EventBus.on(
        "world:changed",
        change => {

            Editor.setDirty(
                true
            );


            /*
             * The renderer and inspector can react
             * independently to this event.
             */

            EventBus.emit(
                "editor:changed",
                change
            );

        }
    );


    EventBus.on(
        "object:changed",
        change => {

            Editor.setDirty(
                true
            );


            EventBus.emit(
                "editor:changed",
                change
            );

        }
    );


    EventBus.on(
        "wire:changed",
        change => {

            Editor.setDirty(
                true
            );


            EventBus.emit(
                "editor:changed",
                change
            );

        }
    );


    Logger.log(
        "World change bridge initialized."
    );

}


/* ============================================================
 * 26. FILE EVENT BRIDGE
 * ============================================================
 */

function initializeFileEvents() {

    EventBus.on(
        "file:parsed",
        result => {

            /*
             * parser.js can return either:
             *
             * {
             *     world: ...,
             *     metadata: ...
             * }
             *
             * or a world directly.
             */

            if (
                result &&
                typeof result ===
                "object" &&
                "world" in result
            ) {

                EditorState.world =
                    result.world;

            } else {

                EditorState.world =
                    result;

            }


            const world =
                Editor.getRuntime(
                    "world"
                );


            if (
                world &&
                typeof world.load ===
                    "function"
            ) {

                world.load(
                    EditorState.world
                );

            }


            const renderer =
                Editor.getRuntime(
                    "renderer"
                );


            if (
                renderer &&
                typeof renderer.render ===
                    "function"
            ) {

                renderer.render(
                    EditorState.world
                );

            }


            EventBus.emit(
                "editor:loaded",
                EditorState.world
            );

        }
    );


    EventBus.on(
        "file:opened",
        file => {

            Editor.setStatus(
                `Loaded ${file.name}`,
                "success"
            );

        }
    );


    Logger.log(
        "File event bridge initialized."
    );

}


/* ============================================================
 * 27. APPLICATION UPDATE / CACHE HANDLING
 * ============================================================
 *
 * GitHub Pages can keep an older JavaScript/CSS version in
 * the browser cache. This system provides a lightweight
 * version marker so the editor can detect a new deployment.
 *
 * It does NOT automatically reload in the middle of an edit.
 *
 * ============================================================
 */

const UpdateManager = {

    storageKey:
        "blse.application.version",


    currentVersion:
        APP.cacheVersion,


    async check() {

        /*
         * First compare against the local version.
         */

        const previous =
            window.localStorage.getItem(
                this.storageKey
            );


        if (
            previous !==
            this.currentVersion
        ) {

            window.localStorage.setItem(
                this.storageKey,
                this.currentVersion
            );


            EventBus.emit(
                "update:first-run",
                this.currentVersion
            );

        }


        /*
         * Check whether index.html has changed.
         *
         * A cache-busting query is used so the request
         * itself isn't satisfied by the existing cache.
         */

        try {

            const response =
                await fetch(
                    `index.html?_blse=${Date.now()}`,
                    {

                        cache:
                            "no-store",

                        headers: {

                            "Cache-Control":
                                "no-cache"

                        }

                    }
                );


            if (
                !response.ok
            ) {

                return false;

            }


            const html =
                await response.text();


            const marker =
                this.extractVersion(
                    html
                );


            if (
                marker &&
                marker !==
                    this.currentVersion
            ) {

                EventBus.emit(
                    "update:available",
                    marker
                );


                return true;

            }

        } catch (error) {

            Logger.warn(
                "Update check failed:",
                error
            );

        }


        return false;

    },


    extractVersion(html) {

        if (
            typeof html !==
            "string"
        ) {

            return null;

        }


        const match =
            html.match(
                /data-blse-version=["']([^"']+)["']/i
            );


        return match
            ? match[1]
            : null;

    },


    forceReload() {

        /*
         * Preserve the URL but add a unique query string
         * to bypass stale page resources.
         */

        const url =
            new URL(
                window.location.href
            );


        url.searchParams.set(
            "blse_refresh",
            Date.now().toString()
        );


        window.location.replace(
            url.toString()
        );

    }

};


/* ============================================================
 * 28. UPDATE EVENT UI
 * ============================================================
 */

function initializeUpdateHandling() {

    EventBus.on(
        "update:available",
        version => {

            Logger.info(
                `Update available: ${version}`
            );


            Editor.setStatus(
                "A new editor version is available.",
                "warning"
            );


            const event =
                new CustomEvent(
                    "blse:update-available",
                    {

                        detail: {

                            version,

                            reload:
                                () => {
                                    UpdateManager
                                        .forceReload();
                                }

                        }

                    }
                );


            window.dispatchEvent(
                event
            );

        }
    );


    Logger.log(
        "Update handling initialized."
    );

}


/* ============================================================
 * 29. CORE EXTENSIONS INITIALIZATION
 * ============================================================
 */

function initializePartTwo() {

    FileManager.initialize();

    initializeUnloadProtection();

    initializeHistory();

    initializeWorldBridge();

    initializeFileEvents();

    initializeUpdateHandling();


    Editor.setStatus(
        "Core systems initialized.",
        "success"
    );


    Logger.info(
        "main.js Part 2 initialized."
    );

}


/* ============================================================
 * 30. START PART 2
 * ============================================================
 *
 * Part 1 already calls bootstrap().
 *
 * We wait until the DOM is ready and then initialize these
 * additional systems.
 *
 * ============================================================
 */

function startPartTwo() {

    try {

        if (
            !EditorState.initialized
        ) {

            initializeCore();

        }


        initializePartTwo();

    } catch (error) {

        Editor.setError(
            error
        );

        Editor.setStatus(
            "Core initialization failed.",
            "error"
        );

    }

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startPartTwo,
        {
            once: true
        }
    );

} else {

    startPartTwo();

}


/* ============================================================
 * 31. EXPORT PART 2 SYSTEMS
 * ============================================================
 */

window.BLSE.FileManager =
    FileManager;


window.BLSE.UpdateManager =
    UpdateManager;




/* ============================================================
 * 32. MODULE LIFECYCLE
 * ============================================================
 */

const ModuleManager = {

    states: new Map(),


    register(
        name,
        module,
        options = {}
    ) {

        if (
            !name ||
            typeof name !== "string"
        ) {

            throw new TypeError(
                "Module name must be a string."
            );

        }


        if (
            !module ||
            typeof module !== "object"
        ) {

            throw new TypeError(
                `Invalid module: ${name}`
            );

        }


        const record = {

            name,

            module,

            dependencies:
                Array.isArray(
                    options.dependencies
                )
                    ? [
                        ...options.dependencies
                    ]
                    : [],

            optionalDependencies:
                Array.isArray(
                    options.optionalDependencies
                )
                    ? [
                        ...options.optionalDependencies
                    ]
                    : [],

            initialized: false,

            started: false,

            failed: false,

            error: null

        };


        this.states.set(
            name,
            record
        );


        Editor.registerModule(
            name,
            module
        );


        return record;

    },


    get(name) {

        return this.states.get(
            name
        ) || null;

    },


    isInitialized(name) {

        return Boolean(
            this.states.get(
                name
            )?.initialized
        );

    },


    isStarted(name) {

        return Boolean(
            this.states.get(
                name
            )?.started
        );

    },


    dependenciesReady(record) {

        for (
            const dependency
            of record.dependencies
        ) {

            const dependencyRecord =
                this.states.get(
                    dependency
                );


            if (
                !dependencyRecord ||
                !dependencyRecord.initialized
            ) {

                return false;

            }

        }


        return true;

    },


    async initialize(
        record
    ) {

        if (
            record.initialized
        ) {

            return;

        }


        if (
            record.failed
        ) {

            throw (
                record.error ||
                new Error(
                    `Module previously failed: ${record.name}`
                )
            );

        }


        /*
         * Initialize required dependencies first.
         */

        for (
            const dependency
            of record.dependencies
        ) {

            const dependencyRecord =
                this.states.get(
                    dependency
                );


            if (!dependencyRecord) {

                throw new Error(
                    `Missing dependency "${dependency}" required by "${record.name}".`
                );

            }


            await this.initialize(
                dependencyRecord
            );

        }


        /*
         * Optional dependencies are intentionally not
         * required to exist.
         */

        try {

            const module =
                record.module;


            if (
                typeof module.initialize ===
                "function"
            ) {

                await module.initialize({

                    app:
                        Editor,

                    state:
                        EditorState,

                    events:
                        EventBus,

                    dom:
                        DOM,

                    runtime:
                        EditorState.runtime,

                    dependencies:
                        this.getDependencies(
                            record
                        )

                });

            }


            record.initialized =
                true;


            EventBus.emit(
                "module:initialized",
                record
            );


            Logger.log(
                `Module initialized: ${record.name}`
            );

        } catch (error) {

            record.failed =
                true;

            record.error =
                error;


            EventBus.emit(
                "module:error",
                record,
                error
            );


            throw error;

        }

    },


    async start(
        record
    ) {

        if (
            record.started
        ) {

            return;

        }


        if (
            !record.initialized
        ) {

            await this.initialize(
                record
            );

        }


        try {

            if (
                typeof record.module.start ===
                "function"
            ) {

                await record.module.start({

                    app:
                        Editor,

                    state:
                        EditorState,

                    events:
                        EventBus,

                    dom:
                        DOM,

                    runtime:
                        EditorState.runtime,

                    dependencies:
                        this.getDependencies(
                            record
                        )

                });

            }


            record.started =
                true;


            EventBus.emit(
                "module:started",
                record
            );


            Logger.log(
                `Module started: ${record.name}`
            );

        } catch (error) {

            record.failed =
                true;

            record.error =
                error;


            EventBus.emit(
                "module:error",
                record,
                error
            );


            throw error;

        }

    },


    getDependencies(
        record
    ) {

        const result = {};


        for (
            const dependency
            of [
                ...record.dependencies,

                ...record.optionalDependencies
            ]
        ) {

            result[dependency] =
                Editor.getModule(
                    dependency
                ) || null;

        }


        return result;

    },


    async initializeAll() {

        const records =
            [...this.states.values()];


        /*
         * Continue attempting initialization until
         * all possible modules have been processed.
         */

        let remaining =
            records.filter(
                record =>
                    !record.initialized &&
                    !record.failed
            );


        let progress =
            true;


        while (
            remaining.length &&
            progress
        ) {

            progress =
                false;


            for (
                const record
                of remaining
            ) {

                const ready =
                    this.dependenciesReady(
                        record
                    );


                if (!ready) {

                    continue;

                }


                try {

                    await this.initialize(
                        record
                    );

                    progress =
                        true;

                } catch (error) {

                    Logger.error(
                        `Module "${record.name}" failed:`,
                        error
                    );

                    progress =
                        true;

                }

            }


            remaining =
                records.filter(
                    record =>
                        !record.initialized &&
                        !record.failed
                );

        }


        /*
         * Detect dependency deadlocks.
         */

        if (
            remaining.length
        ) {

            const names =
                remaining.map(
                    record =>
                        record.name
                );


            Logger.warn(
                "Modules could not be initialized:",
                names
            );


            for (
                const record
                of remaining
            ) {

                record.failed =
                    true;

                record.error =
                    new Error(
                        `Unresolved module dependencies for "${record.name}".`
                    );

            }

        }

    },


    async startAll() {

        const records =
            [...this.states.values()];


        for (
            const record
            of records
        ) {

            if (
                record.failed
            ) {

                continue;

            }


            try {

                await this.start(
                    record
                );

            } catch (error) {

                Logger.error(
                    `Unable to start ${record.name}:`,
                    error
                );

            }

        }

    }

};


/* ============================================================
 * 33. RUNTIME REGISTRATION HELPERS
 * ============================================================
 */

Editor.defineRuntime = function(
    name,
    instance,
    options = {}
) {

    Editor.registerRuntime(
        name,
        instance
    );


    if (
        options.module !== false
    ) {

        ModuleManager.register(
            `runtime:${name}`,
            instance,
            {

                dependencies:
                    options.dependencies ||
                    []

            }
        );

    }


    return instance;

};


/* ============================================================
 * 34. STANDARD RUNTIME COMPONENT DETECTION
 * ============================================================
 */

const RuntimeBridge = {

    aliases: {

        parser: [
            "parser",
            "Parser"
        ],

        encoder: [
            "encoder",
            "Encoder"
        ],

        renderer: [
            "renderer",
            "Renderer"
        ],

        world: [
            "world",
            "World"
        ],

        wire: [
            "wire",
            "Wire"
        ],

        inspector: [
            "inspector",
            "Inspector"
        ],

        items: [
            "items",
            "Items",
            "itemRegistry"
        ]

    },


    register(
        name,
        component
    ) {

        if (
            !component
        ) {

            return null;

        }


        Editor.registerRuntime(
            name,
            component
        );


        EventBus.emit(
            `runtime:${name}`,
            component
        );


        return component;

    },


    discoverGlobal(
        name
    ) {

        const aliases =
            this.aliases[name] ||
            [];


        for (
            const alias
            of aliases
        ) {

            if (
                window[alias]
            ) {

                return window[alias];

            }

        }


        return null;

    },


    discoverAll() {

        for (
            const name
            of Object.keys(
                this.aliases
            )
        ) {

            if (
                Editor.getRuntime(
                    name
                )
            ) {

                continue;

            }


            const component =
                this.discoverGlobal(
                    name
                );


            if (
                component
            ) {

                this.register(
                    name,
                    component
                );

            }

        }

    }

};


/* ============================================================
 * 35. COMMAND REGISTRY
 * ============================================================
 */

const CommandManager = {

    commands: new Map(),


    register(
        name,
        handler,
        options = {}
    ) {

        if (
            !name ||
            typeof name !== "string"
        ) {

            throw new TypeError(
                "Command name must be a string."
            );

        }


        if (
            typeof handler !==
            "function"
        ) {

            throw new TypeError(
                `Command "${name}" requires a function.`
            );

        }


        this.commands.set(
            name,
            {

                name,

                handler,

                description:
                    options.description ||
                    "",

                shortcut:
                    options.shortcut ||
                    null

            }
        );


        EventBus.emit(
            "command:registered",
            name
        );


        return this.commands.get(
            name
        );

    },


    unregister(name) {

        return this.commands.delete(
            name
        );

    },


    has(name) {

        return this.commands.has(
            name
        );

    },


    async execute(
        name,
        ...args
    ) {

        const command =
            this.commands.get(
                name
            );


        if (!command) {

            Logger.warn(
                `Unknown command: ${name}`
            );

            return undefined;

        }


        try {

            return await command.handler(
                ...args
            );

        } catch (error) {

            Logger.error(
                `Command failed: ${name}`,
                error
            );


            Editor.setError(
                error
            );


            throw error;

        }

    },


    list() {

        return [
            ...this.commands.values()
        ];

    }

};


/* ============================================================
 * 36. STANDARD COMMANDS
 * ============================================================
 */

function registerStandardCommands() {

    CommandManager.register(
        "open",
        () => {

            FileManager.openDialog();

        },
        {

            description:
                "Open a Build Logic save file.",

            shortcut:
                "Ctrl+O"

        }
    );


    CommandManager.register(
        "save",
        () => {

            return FileManager.save();

        },
        {

            description:
                "Save the current world.",

            shortcut:
                "Ctrl+S"

        }
    );


    CommandManager.register(
        "save-as",
        () => {

            return FileManager.saveAs();

        },
        {

            description:
                "Save the current world as a new file."

        }
    );


    CommandManager.register(
        "undo",
        () => {

            EventBus.emit(
                "history:undo"
            );

        },
        {

            description:
                "Undo the previous change.",

            shortcut:
                "Ctrl+Z"

        }
    );


    CommandManager.register(
        "redo",
        () => {

            EventBus.emit(
                "history:redo"
            );

        },
        {

            description:
                "Redo the previous change.",

            shortcut:
                "Ctrl+Y"

        }
    );


    CommandManager.register(
        "select-all",
        () => {

            EventBus.emit(
                "selection:all"
            );

        },
        {

            description:
                "Select all objects."

        }
    );


    CommandManager.register(
        "delete",
        () => {

            EventBus.emit(
                "selection:delete"
            );

        },
        {

            description:
                "Delete the selected objects."

        }
    );


    CommandManager.register(
        "escape",
        () => {

            Editor.clearSelection();

        },
        {

            description:
                "Clear the current selection.",

            shortcut:
                "Escape"

        }
    );


    Logger.log(
        "Standard commands registered."
    );

}


/* ============================================================
 * 37. COMMAND EVENT BRIDGE
 * ============================================================
 */

function initializeCommandBridge() {

    EventBus.on(
        "command:save",
        () => {

            CommandManager.execute(
                "save"
            );

        }
    );


    EventBus.on(
        "command:open",
        () => {

            CommandManager.execute(
                "open"
            );

        }
    );


    EventBus.on(
        "command:save-as",
        () => {

            CommandManager.execute(
                "save-as"
            );

        }
    );


    EventBus.on(
        "command:undo",
        () => {

            CommandManager.execute(
                "undo"
            );

        }
    );


    EventBus.on(
        "command:redo",
        () => {

            CommandManager.execute(
                "redo"
            );

        }
    );


    EventBus.on(
        "command:escape",
        () => {

            CommandManager.execute(
                "escape"
            );

        }
    );


    Logger.log(
        "Command bridge initialized."
    );

}


/* ============================================================
 * 38. PLUGIN LIFECYCLE HOOKS
 * ============================================================
 */

const PluginBridge = {

    hooks: new Map(),


    registerHook(
        name,
        callback
    ) {

        if (
            typeof callback !==
            "function"
        ) {

            return;

        }


        if (
            !this.hooks.has(name)
        ) {

            this.hooks.set(
                name,
                new Set()
            );

        }


        this.hooks
            .get(name)
            .add(callback);

    },


    async runHook(
        name,
        ...args
    ) {

        const hooks =
            this.hooks.get(
                name
            );


        if (!hooks) {

            return;

        }


        for (
            const hook
            of [...hooks]
        ) {

            try {

                await hook(
                    ...args
                );

            } catch (error) {

                Logger.error(
                    `Plugin hook "${name}" failed:`,
                    error
                );

            }

        }

    },


    async initialize() {

        await this.runHook(
            "beforeInit",
            Editor
        );


        EventBus.emit(
            "plugins:before-init"
        );

    },


    async ready() {

        await this.runHook(
            "ready",
            Editor
        );


        EventBus.emit(
            "plugins:ready"
        );

    },


    async shutdown() {

        await this.runHook(
            "shutdown",
            Editor
        );


        EventBus.emit(
            "plugins:shutdown"
        );

    }

};


/* ============================================================
 * 39. APPLICATION LIFECYCLE
 * ============================================================
 */

const ApplicationLifecycle = {

    phase:
        "created",


    async setPhase(
        phase
    ) {

        this.phase =
            phase;


        EventBus.emit(
            `app:${phase}`,
            {

                phase

            }
        );


        await PluginBridge.runHook(
            phase,
            Editor
        );

    },


    getPhase() {

        return this.phase;

    }

};


/* ============================================================
 * 40. MODULE AUTO-REGISTRATION
 * ============================================================
 *
 * Runtime scripts can expose themselves through either:
 *
 *     window.BLSEModules
 *
 * or:
 *
 *     window.BLSERuntime
 *
 * before main.js reaches this point.
 *
 * ============================================================
 */

function discoverModules() {

    const modules =
        window.BLSEModules;


    if (
        modules &&
        typeof modules ===
        "object"
    ) {

        for (
            const [name, definition]
            of Object.entries(
                modules
            )
        ) {

            if (
                !definition
            ) {

                continue;

            }


            if (
                Editor.hasModule(
                    name
                )
            ) {

                continue;

            }


            ModuleManager.register(
                name,
                definition,
                {

                    dependencies:
                        definition.dependencies ||
                        []

                }
            );

        }

    }


    RuntimeBridge.discoverAll();


    Logger.log(
        "Module discovery complete."
    );

}


/* ============================================================
 * 41. CORE MODULE REGISTRATION
 * ============================================================
 */

function registerCoreModules() {

    /*
     * FileManager
     */

    if (
        !Editor.hasModule(
            "file-manager"
        )
    ) {

        ModuleManager.register(
            "file-manager",
            FileManager
        );

    }


    /*
     * UpdateManager
     */

    if (
        !Editor.hasModule(
            "update-manager"
        )
    ) {

        ModuleManager.register(
            "update-manager",
            UpdateManager
        );

    }


    /*
     * CommandManager
     */

    if (
        !Editor.hasModule(
            "command-manager"
        )
    ) {

        ModuleManager.register(
            "command-manager",
            CommandManager
        );

    }


    Logger.log(
        "Core modules registered."
    );

}


/* ============================================================
 * 42. COMPONENT CONNECTION
 * ============================================================
 */

function connectRuntimeComponents() {

    const runtime =
        EditorState.runtime;


    /*
     * Parser
     */

    if (
        runtime.parser
    ) {

        EventBus.emit(
            "parser:available",
            runtime.parser
        );

    }


    /*
     * Encoder
     */

    if (
        runtime.encoder
    ) {

        EventBus.emit(
            "encoder:available",
            runtime.encoder
        );

    }


    /*
     * World
     */

    if (
        runtime.world
    ) {

        EventBus.emit(
            "world:available",
            runtime.world
        );

    }


    /*
     * Renderer
     */

    if (
        runtime.renderer
    ) {

        EventBus.emit(
            "renderer:available",
            runtime.renderer
        );

    }


    /*
     * Wire system
     */

    if (
        runtime.wire
    ) {

        EventBus.emit(
            "wire:available",
            runtime.wire
        );

    }


    /*
     * Inspector
     */

    if (
        runtime.inspector
    ) {

        EventBus.emit(
            "inspector:available",
            runtime.inspector
        );

    }


    /*
     * Item registry
     */

    if (
        runtime.items
    ) {

        EventBus.emit(
            "items:available",
            runtime.items
        );

    }


    Logger.log(
        "Runtime components connected."
    );

}


/* ============================================================
 * 43. APPLICATION STARTUP
 * ============================================================
 */

async function initializeApplication() {

    if (
        EditorState.ready
    ) {

        return;

    }


    try {

        await ApplicationLifecycle
            .setPhase(
                "starting"
            );


        Editor.setStatus(
            "Starting editor...",
            "accent"
        );


        /*
         * Discover components that may already have
         * registered themselves.
         */

        discoverModules();


        /*
         * Register the systems provided by main.js.
         */

        registerCoreModules();


        /*
         * Commands must exist before modules start.
         */

        registerStandardCommands();

        initializeCommandBridge();


        /*
         * Allow plugins to prepare themselves.
         */

        await PluginBridge.initialize();


        /*
         * Initialize registered modules.
         */

        await ModuleManager
            .initializeAll();


        /*
         * Start registered modules.
         */

        await ModuleManager
            .startAll();


        /*
         * Re-scan runtime components after modules have
         * had an opportunity to register them.
         */

        RuntimeBridge.discoverAll();

        connectRuntimeComponents();


        /*
         * Check for a newer deployment.
         */

        UpdateManager.check()
            .catch(
                error => {

                    Logger.warn(
                        "Background update check failed:",
                        error
                    );

                }
            );


        await ApplicationLifecycle
            .setPhase(
                "started"
            );


        await PluginBridge.ready();


        Editor.setReady();


        Editor.setStatus(
            "Ready",
            "success"
        );


    } catch (error) {

        Editor.setError(
            error
        );


        await ApplicationLifecycle
            .setPhase(
                "error"
            );


        Editor.setStatus(
            "Editor failed to initialize.",
            "error"
        );


        Logger.error(
            "Application startup failed:",
            error
        );

    }

}


/* ============================================================
 * 44. STARTUP EVENT
 * ============================================================
 */

EventBus.once(
    "app:core-ready",
    () => {

        initializeApplication();

    }
);


/* ============================================================
 * 45. PART 3 STARTUP HOOK
 * ============================================================
 */

function startPartThree() {

    try {

        if (
            !EditorState.initialized
        ) {

            initializeCore();

        }


        initializePartTwo();

        initializeCommandBridge();


        EventBus.emit(
            "app:core-ready"
        );


    } catch (error) {

        Editor.setError(
            error
        );

    }

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startPartThree,
        {
            once: true
        }
    );

} else {

    startPartThree();

}


/* ============================================================
 * 46. PUBLIC API
 * ============================================================
 */

window.BLSE.ModuleManager =
    ModuleManager;


window.BLSE.RuntimeBridge =
    RuntimeBridge;


window.BLSE.CommandManager =
    CommandManager;


window.BLSE.PluginBridge =
    PluginBridge;


window.BLSE.ApplicationLifecycle =
    ApplicationLifecycle;




/* ============================================================
 * 47. UI STATE MANAGER
 * ============================================================
 */

const UIManager = {

    elements: {},

    initialized: false,


    initialize() {

        this.elements = {

            app:
                DOM.byId("app"),

            toolbar:
                DOM.get(".toolbar"),

            statusBar:
                DOM.byId("status-bar"),

            statusMessage:
                DOM.get(
                    "#status-bar .status-message"
                ),

            saveButton:
                DOM.get(
                    '[data-command="save"]'
                ),

            openButton:
                DOM.get(
                    '[data-command="open"]'
                ),

            undoButton:
                DOM.get(
                    '[data-command="undo"]'
                ),

            redoButton:
                DOM.get(
                    '[data-command="redo"]'
                ),

            deleteButton:
                DOM.get(
                    '[data-command="delete"]'
                ),

            modeButtons:
                DOM.getAll(
                    "[data-editor-mode]"
                ),

            panels:
                DOM.getAll(
                    "[data-panel]"
                )

        };


        this.bindCommands();

        this.bindModes();

        this.bindStateEvents();


        this.initialized =
            true;


        Logger.log(
            "UI manager initialized."
        );

    },


    bindCommands() {

        const commandButtons =
            DOM.getAll(
                "[data-command]"
            );


        for (
            const button
            of commandButtons
        ) {

            const command =
                button.dataset.command;


            if (!command) {

                continue;

            }


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    CommandManager.execute(
                        command
                    );

                }
            );

        }

    },


    bindModes() {

        for (
            const button
            of this.elements.modeButtons
        ) {

            button.addEventListener(
                "click",
                () => {

                    const mode =
                        button.dataset
                            .editorMode;


                    if (!mode) {

                        return;

                    }


                    Editor.setMode(
                        mode
                    );

                }
            );

        }

    },


    bindStateEvents() {

        EventBus.on(
            "save:dirty",
            dirty => {

                this.updateDirtyState(
                    dirty
                );

            }
        );


        EventBus.on(
            "selection:changed",
            selection => {

                this.updateSelectionState(
                    selection
                );

            }
        );


        EventBus.on(
            "history:changed",
            history => {

                this.updateHistoryState(
                    history
                );

            }
        );


        EventBus.on(
            "editor:mode",
            mode => {

                this.updateModeState(
                    mode
                );

            }
        );


        EventBus.on(
            "app:ready",
            () => {

                this.setApplicationReady();

            }
        );


        EventBus.on(
            "app:error",
            error => {

                this.showError(
                    error
                );

            }
        );

    },


    updateDirtyState(
        dirty
    ) {

        if (
            this.elements.app
        ) {

            this.elements.app
                .classList.toggle(
                    "has-unsaved-changes",
                    Boolean(dirty)
                );

        }


        const button =
            this.elements.saveButton;


        if (
            button
        ) {

            button.disabled =
                !dirty;

        }

    },


    updateSelectionState(
        selection
    ) {

        const count =
            (
                selection?.objects
                    ?.length ||
                0
            ) +
            (
                selection?.wires
                    ?.length ||
                0
            );


        if (
            this.elements.app
        ) {

            this.elements.app
                .dataset.selectionCount =
                String(count);

        }


        EventBus.emit(
            "ui:selection-updated",
            count
        );

    },


    updateHistoryState(
        history
    ) {

        if (
            this.elements.undoButton
        ) {

            this.elements.undoButton.disabled =
                !history.undo.length;

        }


        if (
            this.elements.redoButton
        ) {

            this.elements.redoButton.disabled =
                !history.redo.length;

        }

    },


    updateModeState(
        mode
    ) {

        for (
            const button
            of this.elements.modeButtons
        ) {

            button.classList.toggle(
                "active",
                button.dataset
                    .editorMode === mode
            );

            button.setAttribute(
                "aria-pressed",
                String(
                    button.dataset
                        .editorMode === mode
                )
            );

        }


        if (
            this.elements.app
        ) {

            this.elements.app.dataset.mode =
                mode;

        }

    },


    setApplicationReady() {

        if (
            this.elements.app
        ) {

            this.elements.app
                .classList.add(
                    "ready"
                );

        }

    },


    showError(
        error
    ) {

        const message =
            error?.message ||
            String(error);


        if (
            this.elements.statusMessage
        ) {

            this.elements.statusMessage
                .textContent =
                message;

        }

    }

};


/* ============================================================
 * 48. EDITOR MODE
 * ============================================================
 */

Editor.setMode = function(
    mode
) {

    if (
        typeof mode !== "string" ||
        !mode
    ) {

        return;

    }


    const previous =
        EditorState.mode;


    if (
        previous === mode
    ) {

        return;

    }


    EditorState.mode =
        mode;


    EventBus.emit(
        "editor:mode",
        mode,
        previous
    );


    Logger.log(
        `Editor mode changed: ${previous} → ${mode}`
    );

};


/* ============================================================
 * 49. PANEL MANAGEMENT
 * ============================================================
 */

Editor.openPanel = function(
    panel
) {

    if (
        !panel
    ) {

        return;

    }


    const element =
        typeof panel === "string"

            ? DOM.get(
                `[data-panel="${panel}"]`
            )

            : panel;


    if (!element) {

        return;

    }


    DOM.show(
        element
    );


    EventBus.emit(
        "panel:opened",
        element
    );

};


Editor.closePanel = function(
    panel
) {

    if (
        !panel
    ) {

        return;

    }


    const element =
        typeof panel === "string"

            ? DOM.get(
                `[data-panel="${panel}"]`
            )

            : panel;


    if (!element) {

        return;

    }


    DOM.hide(
        element
    );


    EventBus.emit(
        "panel:closed",
        element
    );

};


Editor.togglePanel = function(
    panel
) {

    const element =
        typeof panel === "string"

            ? DOM.get(
                `[data-panel="${panel}"]`
            )

            : panel;


    if (!element) {

        return;

    }


    const visible =
        !element.classList.contains(
            "hidden"
        );


    if (visible) {

        this.closePanel(
            element
        );

    } else {

        this.openPanel(
            element
        );

    }

};


/* ============================================================
 * 50. KEYBOARD SHORTCUTS
 * ============================================================
 */

const KeyboardManager = {

    shortcuts: new Map(),


    register(
        shortcut,
        command
    ) {

        this.shortcuts.set(
            shortcut.toLowerCase(),
            command
        );

    },


    normalize(
        event
    ) {

        const parts = [];


        if (
            event.ctrlKey ||
            event.metaKey
        ) {

            parts.push(
                "ctrl"
            );

        }


        if (
            event.shiftKey
        ) {

            parts.push(
                "shift"
            );

        }


        if (
            event.altKey
        ) {

            parts.push(
                "alt"
            );

        }


        let key =
            event.key.toLowerCase();


        if (
            key === " "
        ) {

            key = "space";

        }


        parts.push(
            key
        );


        return parts.join(
            "+"
        );

    },


    handle(
        event
    ) {

        /*
         * Don't interfere with text inputs.
         */

        const target =
            event.target;


        const tag =
            target?.tagName
                ?.toLowerCase();


        const editing =
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            target?.isContentEditable;


        if (
            editing &&
            !(
                event.ctrlKey ||
                event.metaKey
            )
        ) {

            return;

        }


        const shortcut =
            this.normalize(
                event
            );


        const command =
            this.shortcuts.get(
                shortcut
            );


        if (!command) {

            return;

        }


        event.preventDefault();


        CommandManager.execute(
            command
        );

    }

};


/* ============================================================
 * 51. STANDARD SHORTCUTS
 * ============================================================
 */

function initializeKeyboardManager() {

    KeyboardManager.register(
        "ctrl+s",
        "save"
    );


    KeyboardManager.register(
        "ctrl+o",
        "open"
    );


    KeyboardManager.register(
        "ctrl+z",
        "undo"
    );


    KeyboardManager.register(
        "ctrl+y",
        "redo"
    );


    KeyboardManager.register(
        "ctrl+shift+z",
        "redo"
    );


    KeyboardManager.register(
        "escape",
        "escape"
    );


    KeyboardManager.register(
        "delete",
        "delete"
    );


    KeyboardManager.register(
        "backspace",
        "delete"
    );


    document.addEventListener(
        "keydown",
        event => {

            KeyboardManager.handle(
                event
            );

        }
    );


    Logger.log(
        "Keyboard manager initialized."
    );

}


/* ============================================================
 * 52. SELECTION COMMANDS
 * ============================================================
 */

function initializeSelectionCommands() {

    CommandManager.register(
        "delete",
        () => {

            EventBus.emit(
                "selection:delete",
                EditorState.selection
            );

        }
    );


    CommandManager.register(
        "select-all",
        () => {

            EventBus.emit(
                "selection:all"
            );

        }
    );


    EventBus.on(
        "selection:delete",
        selection => {

            const world =
                Editor.getRuntime(
                    "world"
                );


            if (
                !world
            ) {

                return;

            }


            /*
             * Give the world implementation the
             * opportunity to handle deletion.
             */

            if (
                typeof world.deleteSelection ===
                "function"
            ) {

                world.deleteSelection(
                    selection
                );

                return;

            }


            if (
                typeof world.remove ===
                "function"
            ) {

                const objects =
                    selection?.objects ||
                    [];


                for (
                    const object
                    of objects
                ) {

                    world.remove(
                        object
                    );

                }

            }

        }
    );

}


/* ============================================================
 * 53. CLIPBOARD SYSTEM
 * ============================================================
 */

const ClipboardManager = {

    data: null,


    async copy() {

        const selection =
            EditorState.selection;


        if (
            !selection.objects.length &&
            !selection.wires.length
        ) {

            return;

        }


        /*
         * Ask the world system for a portable
         * representation when possible.
         */

        const world =
            Editor.getRuntime(
                "world"
            );


        let data;


        if (
            world &&
            typeof world.serializeSelection ===
            "function"
        ) {

            data =
                await world.serializeSelection(
                    selection
                );

        } else {

            data = {

                objects:
                    selection.objects,

                wires:
                    selection.wires

            };

        }


        this.data =
            data;


        try {

            await navigator.clipboard
                ?.writeText(
                    JSON.stringify(
                        data
                    )
                );

        } catch {

            /*
             * Clipboard permissions aren't always
             * available. Internal clipboard data still
             * remains usable.
             */

        }


        EventBus.emit(
            "clipboard:copied",
            data
        );

    },


    async paste() {

        let data =
            this.data;


        try {

            const text =
                await navigator.clipboard
                    ?.readText();


            if (
                text
            ) {

                const parsed =
                    JSON.parse(
                        text
                    );


                if (
                    parsed &&
                    typeof parsed ===
                    "object"
                ) {

                    data =
                        parsed;

                }

            }

        } catch {

            /*
             * Fall back to the internal clipboard.
             */

        }


        if (!data) {

            return;

        }


        const world =
            Editor.getRuntime(
                "world"
            );


        if (
            world &&
            typeof world.paste ===
            "function"
        ) {

            const result =
                await world.paste(
                    data
                );


            Editor.setDirty(
                true
            );


            EventBus.emit(
                "clipboard:pasted",
                result
            );


            return result;

        }


        EventBus.emit(
            "clipboard:paste-request",
            data
        );

    }

};


/* ============================================================
 * 54. CLIPBOARD COMMANDS
 * ============================================================
 */

function initializeClipboardCommands() {

    CommandManager.register(
        "copy",
        () => {

            return ClipboardManager.copy();

        },
        {

            description:
                "Copy selected objects.",

            shortcut:
                "Ctrl+C"

        }
    );


    CommandManager.register(
        "paste",
        () => {

            return ClipboardManager.paste();

        },
        {

            description:
                "Paste copied objects.",

            shortcut:
                "Ctrl+V"

        }
    );


    KeyboardManager.register(
        "ctrl+c",
        "copy"
    );


    KeyboardManager.register(
        "ctrl+v",
        "paste"
    );

}


/* ============================================================
 * 55. DIAGNOSTICS
 * ============================================================
 */

const Diagnostics = {

    startedAt:
        Date.now(),


    getModules() {

        return [
            ...ModuleManager.states.values()
        ].map(
            record => ({

                name:
                    record.name,

                initialized:
                    record.initialized,

                started:
                    record.started,

                failed:
                    record.failed,

                error:
                    record.error
                        ?.message ||
                    null

            })
        );

    },


    getRuntime() {

        const result = {};


        for (
            const key
            of Object.keys(
                EditorState.runtime
            )
        ) {

            result[key] =
                Boolean(
                    EditorState.runtime[key]
                );

        }


        return result;

    },


    getState() {

        return {

            initialized:
                EditorState.initialized,

            ready:
                EditorState.ready,

            loading:
                EditorState.loading,

            dirty:
                EditorState.dirty,

            mode:
                EditorState.mode,

            selection: {

                objects:
                    EditorState.selection
                        .objects.length,

                wires:
                    EditorState.selection
                        .wires.length

            },

            history: {

                undo:
                    EditorState.history
                        .undo.length,

                redo:
                    EditorState.history
                        .redo.length

            },

            file:
                {
                    ...EditorState.file
                }

        };

    },


    report() {

        return {

            application: {

                name:
                    APP.name,

                version:
                    APP.version,

                build:
                    APP.build,

                cacheVersion:
                    APP.cacheVersion

            },

            lifecycle: {

                phase:
                    ApplicationLifecycle
                        .getPhase(),

                uptime:
                    Date.now() -
                    this.startedAt

            },

            state:
                this.getState(),

            runtime:
                this.getRuntime(),

            modules:
                this.getModules(),

            plugins:
                [
                    ...EditorState.plugins.values()
                ].map(
                    plugin => ({

                        id:
                            plugin.id,

                        name:
                            plugin.name ||
                            plugin.id,

                        version:
                            plugin.version ||
                            "unknown",

                        enabled:
                            plugin.enabled,

                        loaded:
                            plugin.loaded,

                        error:
                            plugin.error
                                ?.message ||
                            null

                    })
                )

        };

    },


    print() {

        const report =
            this.report();


        console.group(
            `${APP.name} Diagnostics`
        );


        console.log(
            report
        );


        console.groupEnd();


        return report;

    }

};


/* ============================================================
 * 56. DEBUG CONSOLE COMMAND
 * ============================================================
 */

CommandManager.register(
    "diagnostics",
    () => {

        return Diagnostics.print();

    },
    {

        description:
            "Print editor diagnostics."

    }
);


/* ============================================================
 * 57. APPLICATION SHUTDOWN
 * ============================================================
 */

const ShutdownManager = {

    shuttingDown:
        false,


    async shutdown() {

        if (
            this.shuttingDown
        ) {

            return;

        }


        this.shuttingDown =
            true;


        try {

            await PluginBridge
                .shutdown();


            const records =
                [
                    ...ModuleManager
                        .states
                        .values()
                ]
                .reverse();


            for (
                const record
                of records
            ) {

                if (
                    !record.started
                ) {

                    continue;

                }


                try {

                    if (
                        typeof record.module.shutdown ===
                        "function"
                    ) {

                        await record.module
                            .shutdown();

                    }

                } catch (error) {

                    Logger.error(
                        `Failed to shut down ${record.name}:`,
                        error
                    );

                }

            }


            EventBus.emit(
                "app:shutdown"
            );


            EditorState.ready =
                false;


            ApplicationLifecycle.phase =
                "shutdown";


        } finally {

            this.shuttingDown =
                false;

        }

    }

};


/* ============================================================
 * 58. PAGE LIFECYCLE
 * ============================================================
 */

function initializePageLifecycle() {

    window.addEventListener(
        "pagehide",
        () => {

            /*
             * Don't block the browser while shutting down.
             */

            ShutdownManager
                .shutdown()
                .catch(
                    error => {

                        Logger.error(
                            "Shutdown failed:",
                            error
                        );

                    }
                );

        }
    );


    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.hidden
            ) {

                EventBus.emit(
                    "app:hidden"
                );

            } else {

                EventBus.emit(
                    "app:visible"
                );

            }

        }
    );

}


/* ============================================================
 * 59. UI INITIALIZATION
 * ============================================================
 */

function initializeUI() {

    UIManager.initialize();

    initializeKeyboardManager();

    initializeSelectionCommands();

    initializeClipboardCommands();

    initializePageLifecycle();


    /*
     * Make the initial state available to the UI.
     */

    UIManager.updateDirtyState(
        EditorState.dirty
    );


    UIManager.updateSelectionState(
        EditorState.selection
    );


    UIManager.updateHistoryState(
        EditorState.history
    );


    UIManager.updateModeState(
        EditorState.mode
    );


    Logger.log(
        "UI systems initialized."
    );

}


/* ============================================================
 * 60. FINAL STARTUP GUARD
 * ============================================================
 */

let finalStartupComplete =
    false;


async function finalizeApplication() {

    if (
        finalStartupComplete
    ) {

        return;

    }


    finalStartupComplete =
        true;


    try {

        initializeUI();


        /*
         * Wait until the module system has had a chance
         * to initialize all dynamically loaded components.
         */

        if (
            !EditorState.ready
        ) {

            EventBus.once(
                "app:ready",
                () => {

                    UIManager
                        .updateDirtyState(
                            EditorState.dirty
                        );

                }
            );

        }


        /*
         * Allow external scripts/plugins to know that
         * main.js has completely finished loading.
         */

        window.dispatchEvent(
            new CustomEvent(
                "blse:main-ready",
                {

                    detail: {

                        app:
                            APP,

                        editor:
                            Editor,

                        state:
                            EditorState

                    }

                }
            )
        );


        EventBus.emit(
            "main:ready"
        );


        Logger.info(
            "main.js fully initialized."
        );


    } catch (error) {

        finalStartupComplete =
            false;


        Editor.setError(
            error
        );


        Logger.error(
            "Final startup failed:",
            error
        );

    }

}


/* ============================================================
 * 61. FINAL STARTUP HOOK
 * ============================================================
 */

EventBus.once(
    "app:started",
    () => {

        finalizeApplication();

    }
);


/*
 * If the application already reached the started phase
 * before this handler was registered, finalize immediately.
 */

if (
    ApplicationLifecycle.getPhase() ===
    "started"
) {

    finalizeApplication();

}


/* ============================================================
 * 62. PUBLIC API — FINAL
 * ============================================================
 */

window.BLSE.UI =
    UIManager;


window.BLSE.Keyboard =
    KeyboardManager;


window.BLSE.Clipboard =
    ClipboardManager;


window.BLSE.Diagnostics =
    Diagnostics;


window.BLSE.Shutdown =
    ShutdownManager;


/* ============================================================
 * 63. CONVENIENCE API
 * ============================================================
 */

Editor.openFile = function(
    file
) {

    return FileManager.open(
        file
    );

};


Editor.saveFile = function() {

    return FileManager.save();

};


Editor.saveFileAs = function() {

    return FileManager.saveAs();

};


Editor.undo = function() {

    return CommandManager.execute(
        "undo"
    );

};


Editor.redo = function() {

    return CommandManager.execute(
        "redo"
    );

};


Editor.copy = function() {

    return ClipboardManager.copy();

};


Editor.paste = function() {

    return ClipboardManager.paste();

};


Editor.getDiagnostics = function() {

    return Diagnostics.report();

};


/* ============================================================
 * 64. GLOBAL ERROR HANDLING
 * ============================================================
 */

window.addEventListener(
    "error",
    event => {

        const error =
            event.error ||
            new Error(
                event.message ||
                "Unknown JavaScript error."
            );


        Logger.error(
            "Unhandled error:",
            error
        );


        EventBus.emit(
            "app:unhandled-error",
            error
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        const reason =
            event.reason instanceof Error

                ? event.reason

                : new Error(
                    String(
                        event.reason
                    )
                );


        Logger.error(
            "Unhandled promise rejection:",
            reason
        );


        EventBus.emit(
            "app:unhandled-rejection",
            reason
        );

    }
);


/* ============================================================
 * 65. VERSION INFORMATION
 * ============================================================
 */

window.BLSE.version =
    APP.version;


window.BLSE.build =
    APP.build;


window.BLSE.cacheVersion =
    APP.cacheVersion;


/* ============================================================
 * 66. FINAL APPLICATION MARKER
 * ============================================================
 */

document.documentElement
    .dataset
    .blseVersion =
    APP.cacheVersion;


/* ============================================================
 * 67. FINAL STATUS
 * ============================================================
 */

Logger.log(
    `${APP.name} main.js loaded.`
);
