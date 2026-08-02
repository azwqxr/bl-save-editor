/*
im not a apple -az
 */

"use strict";

class Inspector {

    constructor(container) {

        this.container = container;

        this.component = null;

        this.plugin = null;

    }

    inspect(component) {

        this.component = component;

        this.plugin = Registry.get(component.id);

        this.render();

    }

    clear() {

        this.container.innerHTML = "";

    }

    render() {

        this.clear();

        if (!this.plugin) {

            this.container.innerHTML =
                "<p>No plugin registered.</p>";

            return;

        }

        const fields =
            this.plugin.inspector(this.component);

        for (const field of fields) {

            const element =
                this.createField(field);

            this.container.appendChild(element);

        }

    }

    createField(field) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "inspector-field";

        const label =
            document.createElement("label");

        label.textContent =
            field.label;

        wrapper.appendChild(label);

        let input = null;

        switch (field.type) {

            case "text":

                input =
                    document.createElement("input");

                input.type = "text";

                break;

            case "number":

                input =
                    document.createElement("input");

                input.type = "number";

                break;

            case "checkbox":

                input =
                    document.createElement("input");

                input.type = "checkbox";

                break;

            case "textarea":

                input =
                    document.createElement("textarea");

                break;

            case "color":

                input =
                    document.createElement("input");

                input.type = "color";

                break;

            case "dropdown":

                input =
                    document.createElement("select");

                for (const option of field.options) {

                    const o =
                        document.createElement("option");

                    o.value = option.value;

                    o.textContent = option.label;

                    input.appendChild(o);

                }

                break;

            default:

                input =
                    document.createElement("input");

                input.type = "text";

        }

        this.bind(input, field);

        wrapper.appendChild(input);

        return wrapper;

    }

    bind(input, field) {

        if (field.type === "checkbox") {

            input.checked = !!field.value;

        } else {

            input.value = field.value ?? "";

        }

        input.addEventListener(

            "input",

            () => {

                if (!this.component.pluginData)
                    this.component.pluginData = {};

                if (field.type === "checkbox") {

                    this.component.pluginData[field.name] =
                        input.checked;

                }

                else if (field.type === "number") {

                    this.component.pluginData[field.name] =
                        Number(input.value);

                }

                else {

                    this.component.pluginData[field.name] =
                        input.value;

                }

            }

        );

    }

}

window.Inspector = Inspector;
/* ========================================================= */
/* Inspector Groups                                           */
/* ========================================================= */

Inspector.prototype.createGroup = function(title) {

    const group = document.createElement("fieldset");

    group.className = "inspector-group";

    const legend = document.createElement("legend");
    legend.textContent = title;

    group.appendChild(legend);

    return group;

};

/* ========================================================= */
/* Validation                                                 */
/* ========================================================= */

Inspector.prototype.validateField = function(field, value) {

    if (field.required) {

        if (value === "" || value === null || value === undefined)
            return false;

    }

    if (field.type === "number") {

        if (field.min !== undefined && value < field.min)
            return false;

        if (field.max !== undefined && value > field.max)
            return false;

    }

    return true;

};

/* ========================================================= */
/* Refresh                                                    */
/* ========================================================= */

Inspector.prototype.refresh = function() {

    if (!this.component)
        return;

    this.render();

};

/* ========================================================= */
/* Event System                                               */
/* ========================================================= */

Inspector.prototype.emitChange = function(fieldName, value) {

    const event = new CustomEvent("inspectorchange", {

        detail: {

            component: this.component,

            field: fieldName,

            value: value

        }

    });

    this.container.dispatchEvent(event);

};

/* ========================================================= */
/* Improved Binding                                           */
/* ========================================================= */

Inspector.prototype.bind = function(input, field) {

    if (!this.component.pluginData)
        this.component.pluginData = {};

    const current =
        this.component.pluginData[field.name] ??
        field.value;

    if (field.type === "checkbox")
        input.checked = !!current;
    else
        input.value = current ?? "";

    const update = () => {

        let value;

        switch (field.type) {

            case "checkbox":

                value = input.checked;

                break;

            case "number":

                value = Number(input.value);

                break;

            default:

                value = input.value;

        }

        if (!this.validateField(field, value)) {

            input.classList.add("invalid");

            return;

        }

        input.classList.remove("invalid");

        this.component.pluginData[field.name] = value;

        this.emitChange(field.name, value);

    };

    input.addEventListener("input", update);

    input.addEventListener("change", update);

};

/* ========================================================= */
/* Extra Widgets                                              */
/* ========================================================= */

Inspector.prototype.createButton = function(label, callback) {

    const button = document.createElement("button");

    button.type = "button";

    button.textContent = label;

    button.addEventListener("click", callback);

    return button;

};

Inspector.prototype.createSeparator = function() {

    return document.createElement("hr");

};

Inspector.prototype.createHeading = function(text) {

    const h = document.createElement("h3");

    h.textContent = text;

    return h;

};

/* ========================================================= */
/* Custom Widget Registration                                 */
/* ========================================================= */

Inspector.widgets = {};

Inspector.registerWidget = function(type, builder) {

    Inspector.widgets[type] = builder;

};

/* ========================================================= */
/* Override Field Creation                                    */
/* ========================================================= */

const _createField = Inspector.prototype.createField;

Inspector.prototype.createField = function(field) {

    if (Inspector.widgets[field.type]) {

        return Inspector.widgets[field.type](
            this,
            field
        );

    }

    return _createField.call(this, field);

};

/* ========================================================= */
/* Built-in Slider Widget                                     */
/* ========================================================= */

Inspector.registerWidget("slider", function(inspector, field) {

    const wrapper = document.createElement("div");

    wrapper.className = "inspector-field";

    const label = document.createElement("label");

    label.textContent = field.label;

    const input = document.createElement("input");

    input.type = "range";

    input.min = field.min ?? 0;
    input.max = field.max ?? 100;
    input.step = field.step ?? 1;

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    inspector.bind(input, field);

    return wrapper;

});

/* ========================================================= */
/* Built-in Label Widget                                      */
/* ========================================================= */

Inspector.registerWidget("label", function(inspector, field) {

    const div = document.createElement("div");

    div.className = "inspector-label";

    div.textContent = field.value ?? "";

    return div;

});

/* ========================================================= */
/* Built-in Button Widget                                     */
/* ========================================================= */

Inspector.registerWidget("button", function(inspector, field) {

    return inspector.createButton(

        field.label,

        () => {

            if (field.onClick)
                field.onClick(inspector.component);

        }

    );

});

/* ========================================================= */
/* Utilities                                                  */
/* ========================================================= */

Inspector.prototype.destroy = function() {

    this.clear();

    this.component = null;

    this.plugin = null;

};

Inspector.prototype.getComponent = function() {

    return this.component;

};

Inspector.VERSION = "1.0.0";
