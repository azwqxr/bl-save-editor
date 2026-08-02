/*
why am i not using 3.js -az
 */

"use strict";

class Renderer {

    constructor(canvas) {

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.world = null;

        this.camera = {

            x: 0,
            y: 0,
            zoom: 32

        };

        this.gridSize = 1;

        this.background = "#202124";
        this.gridColor = "#303134";
        this.selectionColor = "#4FC3F7";

        this.selected = null;

        this.resize();
        this.initialize();

        window.addEventListener(

            "resize",

            () => this.resize()

        );

    }

    setWorld(world) {

        this.world = world;

    }

    resize() {

        this.canvas.width =
            this.canvas.clientWidth;

        this.canvas.height =
            this.canvas.clientHeight;

        this.render();

    }

    clear() {

        this.ctx.fillStyle =
            this.background;

        this.ctx.fillRect(

            0,
            0,
            this.canvas.width,
            this.canvas.height

        );

    }

    worldToScreen(x, z) {

        return {

            x:
                (x - this.camera.x)
                * this.camera.zoom,

            y:
                (z - this.camera.y)
                * this.camera.zoom

        };

    }

    screenToWorld(x, y) {

        return {

            x:
                (x / this.camera.zoom)
                + this.camera.x,

            z:
                (y / this.camera.zoom)
                + this.camera.y

        };

    }

    drawGrid() {

        const ctx = this.ctx;

        ctx.strokeStyle =
            this.gridColor;

        ctx.lineWidth = 1;

        const step =
            this.camera.zoom;

        const offsetX =
            -(this.camera.x * step) % step;

        const offsetY =
            -(this.camera.y * step) % step;

        for (
            let x = offsetX;
            x < this.canvas.width;
            x += step
        ) {

            ctx.beginPath();

            ctx.moveTo(x, 0);

            ctx.lineTo(
                x,
                this.canvas.height
            );

            ctx.stroke();

        }

        for (
            let y = offsetY;
            y < this.canvas.height;
            y += step
        ) {

            ctx.beginPath();

            ctx.moveTo(0, y);

            ctx.lineTo(
                this.canvas.width,
                y
            );

            ctx.stroke();

        }

    }

    drawComponent(component) {

        const pos =
            this.worldToScreen(

                component.position.x,

                component.position.z

            );

        const size =
            this.camera.zoom;

        this.ctx.fillStyle =
            component.color ||
            "#CCCCCC";

        this.ctx.fillRect(

            pos.x,

            pos.y,

            size,

            size

        );

        this.ctx.strokeStyle =
            "#000";

        this.ctx.strokeRect(

            pos.x,

            pos.y,

            size,

            size

        );

        this.ctx.fillStyle =
            "#000";

        this.ctx.font =
            "11px sans-serif";

        this.ctx.fillText(

            component.id,

            pos.x + 3,

            pos.y + 13

        );

    }

    drawSelection() {

        if (!this.selected)
            return;

        const pos =
            this.worldToScreen(

                this.selected.position.x,

                this.selected.position.z

            );

        this.ctx.strokeStyle =
            this.selectionColor;

        this.ctx.lineWidth = 3;

        this.ctx.strokeRect(

            pos.x,

            pos.y,

            this.camera.zoom,

            this.camera.zoom

        );

    }

    render() {

        if (!this.ctx)
            return;

        this.clear();

        this.drawGrid();

        if (this.world) {

            for (const component of this.world.components) {

                this.drawComponent(component);

            }

        }

        this.drawSelection();

    }

}

window.Renderer = Renderer;
/* ========================================================= */
/* Mouse Controls                                             */
/* ========================================================= */

Renderer.prototype.enableControls = function() {

    let dragging = false;

    let lastX = 0;
    let lastY = 0;

    this.hovered = null;

    this.canvas.addEventListener("mousedown", e => {

        if (e.button === 1 || e.button === 2) {

            dragging = true;

            lastX = e.clientX;
            lastY = e.clientY;

        }

    });

    window.addEventListener("mouseup", () => {

        dragging = false;

    });

    window.addEventListener("mousemove", e => {

        if (dragging) {

            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;

            this.camera.x -= dx / this.camera.zoom;
            this.camera.y -= dy / this.camera.zoom;

            lastX = e.clientX;
            lastY = e.clientY;

            this.render();

            return;

        }

        this.hovered = this.pick(

            e.offsetX,

            e.offsetY

        );

        this.render();

    });

    this.canvas.addEventListener("wheel", e => {

        e.preventDefault();

        const before =
            this.screenToWorld(

                e.offsetX,

                e.offsetY

            );

        if (e.deltaY < 0)
            this.camera.zoom *= 1.10;
        else
            this.camera.zoom /= 1.10;

        this.camera.zoom = Math.max(

            8,

            Math.min(

                128,

                this.camera.zoom

            )

        );

        const after =
            this.screenToWorld(

                e.offsetX,

                e.offsetY

            );

        this.camera.x +=
            before.x - after.x;

        this.camera.y +=
            before.z - after.z;

        this.render();

    }, {

        passive: false

    });

    this.canvas.addEventListener("click", e => {

        this.selected = this.pick(

            e.offsetX,

            e.offsetY

        );

        if (this.selected) {

            this.canvas.dispatchEvent(

                new CustomEvent(

                    "componentselected",

                    {

                        detail: this.selected

                    }

                )

            );

        }

        this.render();

    });

    this.canvas.addEventListener("contextmenu", e => {

        e.preventDefault();

    });

};

/* ========================================================= */
/* Picking                                                    */
/* ========================================================= */

Renderer.prototype.pick = function(screenX, screenY) {

    if (!this.world)
        return null;

    const world =
        this.screenToWorld(

            screenX,

            screenY

        );

    for (let i = this.world.components.length - 1; i >= 0; i--) {

        const component =
            this.world.components[i];

        if (

            Math.floor(component.position.x) === Math.floor(world.x) &&

            Math.floor(component.position.z) === Math.floor(world.z)

        ) {

            return component;

        }

    }

    return null;

};

/* ========================================================= */
/* Hover Highlight                                            */
/* ========================================================= */

Renderer.prototype.drawHover = function() {

    if (!this.hovered)
        return;

    const pos =
        this.worldToScreen(

            this.hovered.position.x,

            this.hovered.position.z

        );

    this.ctx.strokeStyle =
        "#FFD54F";

    this.ctx.lineWidth = 2;

    this.ctx.strokeRect(

        pos.x,

        pos.y,

        this.camera.zoom,

        this.camera.zoom

    );

};

/* ========================================================= */
/* Camera Helpers                                             */
/* ========================================================= */

Renderer.prototype.centerOn = function(component) {

    this.camera.x =

        component.position.x -

        (this.canvas.width / this.camera.zoom) / 2;

    this.camera.y =

        component.position.z -

        (this.canvas.height / this.camera.zoom) / 2;

    this.render();

};

Renderer.prototype.resetCamera = function() {

    this.camera.x = 0;
    this.camera.y = 0;
    this.camera.zoom = 32;

    this.render();

};

/* ========================================================= */
/* Selection Helpers                                          */
/* ========================================================= */

Renderer.prototype.getSelection = function() {

    return this.selected;

};

Renderer.prototype.select = function(component) {

    this.selected = component;

    this.render();

};

Renderer.prototype.clearSelection = function() {

    this.selected = null;

    this.render();

};

/* ========================================================= */
/* Override Render                                            */
/* ========================================================= */

const _render =
    Renderer.prototype.render;

Renderer.prototype.render = function() {

    _render.call(this);

    this.drawHover();

};
/* ========================================================= */
/* Drag & Drop                                                */
/* ========================================================= */

Renderer.prototype.enableDragging = function() {

    let draggingComponent = null;
    let dragOffset = { x: 0, z: 0 };

    this.canvas.addEventListener("mousedown", e => {

        if (e.button !== 0)
            return;

        const component = this.pick(e.offsetX, e.offsetY);

        if (!component)
            return;

        draggingComponent = component;

        const world = this.screenToWorld(e.offsetX, e.offsetY);

        dragOffset.x = world.x - component.position.x;
        dragOffset.z = world.z - component.position.z;

    });

    window.addEventListener("mouseup", () => {

        draggingComponent = null;

    });

    window.addEventListener("mousemove", e => {

        if (!draggingComponent)
            return;

        const rect = this.canvas.getBoundingClientRect();

        const world = this.screenToWorld(
            e.clientX - rect.left,
            e.clientY - rect.top
        );

        draggingComponent.position.x =
            Math.round(world.x - dragOffset.x);

        draggingComponent.position.z =
            Math.round(world.z - dragOffset.z);

        this.render();

    });

};

/* ========================================================= */
/* Multi Selection                                            */
/* ========================================================= */

Renderer.prototype.selection = [];

Renderer.prototype.addSelection = function(component) {

    if (!this.selection.includes(component))
        this.selection.push(component);

};

Renderer.prototype.removeSelection = function(component) {

    this.selection =
        this.selection.filter(c => c !== component);

};

Renderer.prototype.clearSelections = function() {

    this.selection.length = 0;

};

Renderer.prototype.drawSelections = function() {

    this.ctx.strokeStyle = "#00FF88";
    this.ctx.lineWidth = 2;

    for (const component of this.selection) {

        const pos = this.worldToScreen(
            component.position.x,
            component.position.z
        );

        this.ctx.strokeRect(
            pos.x,
            pos.y,
            this.camera.zoom,
            this.camera.zoom
        );

    }

};

/* ========================================================= */
/* Layer Support                                              */
/* ========================================================= */

Renderer.prototype.currentLayer = 0;

Renderer.prototype.setLayer = function(y) {

    this.currentLayer = y;

    this.render();

};

Renderer.prototype.visibleComponents = function() {

    if (!this.world)
        return [];

    return this.world.components.filter(component =>
        component.position.y === this.currentLayer
    );

};

/* ========================================================= */
/* Plugin Rendering                                           */
/* ========================================================= */

Renderer.prototype.drawPlugins = function() {

    if (!this.world)
        return;

    for (const component of this.visibleComponents()) {

        const plugin =
            Registry.get(component.id);

        if (!plugin)
            continue;

        if (typeof plugin.draw === "function") {

            plugin.draw(

                this.ctx,

                component,

                this

            );

        }

    }

};

/* ========================================================= */
/* Simple Viewport Culling                                    */
/* ========================================================= */

Renderer.prototype.isVisible = function(component) {

    const pos = this.worldToScreen(
        component.position.x,
        component.position.z
    );

    const size = this.camera.zoom;

    return !(
        pos.x + size < 0 ||
        pos.y + size < 0 ||
        pos.x > this.canvas.width ||
        pos.y > this.canvas.height
    );

};

/* ========================================================= */
/* Render Visible Components                                  */
/* ========================================================= */

Renderer.prototype.drawVisibleComponents = function() {

    for (const component of this.visibleComponents()) {

        if (!this.isVisible(component))
            continue;

        this.drawComponent(component);

    }

};

/* ========================================================= */
/* Keyboard Shortcuts                                         */
/* ========================================================= */

Renderer.prototype.enableKeyboard = function() {

    window.addEventListener("keydown", e => {

        if (!this.selected)
            return;

        switch (e.key) {

            case "Delete":

                if (!this.world)
                    break;

                this.world.components =
                    this.world.components.filter(
                        c => c !== this.selected
                    );

                this.selected = null;

                this.render();

                break;

            case "ArrowLeft":

                this.selected.position.x--;

                break;

            case "ArrowRight":

                this.selected.position.x++;

                break;

            case "ArrowUp":

                this.selected.position.z--;

                break;

            case "ArrowDown":

                this.selected.position.z++;

                break;

            default:

                return;

        }

        this.render();

    });

};

/* ========================================================= */
/* Replace render()                                           */
/* ========================================================= */

Renderer.prototype.render = function() {

    this.clear();

    this.drawGrid();

    this.drawVisibleComponents();

    this.drawPlugins();

    this.drawHover();

    this.drawSelection();

    this.drawSelections();

};

/* ========================================================= */
/* Initialization                                             */
/* ========================================================= */

Renderer.prototype.initialize = function() {

    this.enableControls();

    this.enableDragging();

    this.enableKeyboard();

    this.render();

};

/* ========================================================= */
/* Version                                                    */
/* ========================================================= */

Renderer.VERSION = "1.0.0";
