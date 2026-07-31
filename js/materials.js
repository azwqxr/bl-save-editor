/*
========================================
 Build Logic Save Editor
 materials.js
========================================
*/

const MATERIALS = {
    "": {
        name: "Default",
        code: "",
        color: "#ffffff"
    },

    "2": {
        name: "Glass",
        code: "2",
        color: "#c9f3ff"
    },

    "3": {
        name: "Diamond Plate",
        code: "3",
        color: "#b6b6b6"
    },

    "4": {
        name: "Fabric",
        code: "4",
        color: "#d2d2d2"
    },

    "5": {
        name: "Grass",
        code: "5",
        color: "#4caf50"
    },

    "6": {
        name: "Ice",
        code: "6",
        color: "#dffbff"
    },

    "7": {
        name: "Sand",
        code: "7",
        color: "#e8d37f"
    },

    "8": {
        name: "Wood",
        code: "8",
        color: "#8b5a2b"
    },

    "9": {
        name: "Wooden Planks",
        code: "9",
        color: "#9a6938"
    },

    "a": {
        name: "Foil",
        code: "a",
        color: "#d9d9d9"
    },

    "b": {
        name: "Metal",
        code: "b",
        color: "#808080"
    },

    "c": {
        name: "Brick",
        code: "c",
        color: "#b64d3a"
    },

    "d": {
        name: "Concrete",
        code: "d",
        color: "#8d8d8d"
    },

    "e": {
        name: "Cobblestone",
        code: "e",
        color: "#777777"
    },

    "f": {
        name: "Marble",
        code: "f",
        color: "#efefef"
    },

    "g": {
        name: "Granite",
        code: "g",
        color: "#9a8b8b"
    },

    "h": {
        name: "Slate",
        code: "h",
        color: "#5b5b70"
    },

    "i": {
        name: "Corroded Metal",
        code: "i",
        color: "#708060"
    },

    "j": {
        name: "Force Field",
        code: "j",
        color: "#8d7dff"
    }
};

function getMaterial(code) {
    return MATERIALS[code] || {
        name: "Unknown",
        code: code,
        color: "#ff00ff"
    };
}

function getMaterialCode(name) {

    for (const key in MATERIALS) {

        if (MATERIALS[key].name === name)
            return key;

    }

    return "";
}
