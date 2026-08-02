/*
 * base71.js
 * Part 1/2
 *
 * Build Logic Save Editor
 *
 * Core Base71/Base64 utilities.
 */

const Base71 = (() => {

    "use strict";

    /* ============================================================
       CONSTANTS
    ============================================================ */

    // Used for positions/colors in Build Logic
    const POS_ALPHABET =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$";

    // Used for World IDs / wire references
    const BASE71_ALPHABET =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@$%?&<()";

    const GRID_SIZE = 256;

    const POS_BASE = POS_ALPHABET.length;
    const BASE71_BASE = BASE71_ALPHABET.length;

    /* ============================================================
       LOOKUP TABLES
    ============================================================ */

    const POS_LOOKUP = {};
    const BASE71_LOOKUP = {};

    for (let i = 0; i < POS_ALPHABET.length; i++) {
        POS_LOOKUP[POS_ALPHABET[i]] = i;
    }

    for (let i = 0; i < BASE71_ALPHABET.length; i++) {
        BASE71_LOOKUP[BASE71_ALPHABET[i]] = i;
    }

    /* ============================================================
       VALIDATION
    ============================================================ */

    function isValidPosCharacter(c) {
        return POS_LOOKUP[c] !== undefined;
    }

    function isValidBase71Character(c) {
        return BASE71_LOOKUP[c] !== undefined;
    }

    /* ============================================================
       GENERIC NUMBER ENCODER
    ============================================================ */

    function encodeNumber(value, alphabet = BASE71_ALPHABET) {

        if (!Number.isInteger(value))
            throw new Error("encodeNumber requires an integer.");

        if (value < 0)
            throw new Error("Negative numbers are not supported.");

        const base = alphabet.length;

        if (value === 0)
            return alphabet[0];

        let out = "";

        while (value > 0) {

            out = alphabet[value % base] + out;

            value = Math.floor(value / base);

        }

        return out;

    }

    /* ============================================================
       GENERIC NUMBER DECODER
    ============================================================ */

    function decodeNumber(text, alphabet = BASE71_ALPHABET) {

        const base = alphabet.length;

        const lookup = {};

        for (let i = 0; i < alphabet.length; i++) {

            lookup[alphabet[i]] = i;

        }

        let value = 0;

        for (const c of text) {

            if (lookup[c] === undefined)
                throw new Error("Invalid character '" + c + "'.");

            value *= base;
            value += lookup[c];

        }

        return value;

    }

    /* ============================================================
       POSITION
    ============================================================ */

    function encodePosition(x, y, z) {

        if (
            x < 0 || x >= GRID_SIZE ||
            y < 0 || y >= GRID_SIZE ||
            z < 0 || z >= GRID_SIZE
        ) {

            throw new Error("Position out of range.");

        }

        const index =
            x +
            y * GRID_SIZE +
            z * GRID_SIZE * GRID_SIZE;

        return (
            POS_ALPHABET[(index >> 0) & 63] +
            POS_ALPHABET[(index >> 6) & 63] +
            POS_ALPHABET[(index >> 12) & 63] +
            POS_ALPHABET[(index >> 18) & 63]
        );

    }

    function decodePosition(encoded) {

        if (encoded.length !== 4)
            throw new Error("Position must be 4 characters.");

        let index = 0;

        index |= POS_LOOKUP[encoded[0]];
        index |= POS_LOOKUP[encoded[1]] << 6;
        index |= POS_LOOKUP[encoded[2]] << 12;
        index |= POS_LOOKUP[encoded[3]] << 18;

        const x = index % GRID_SIZE;

        const y = Math.floor(index / GRID_SIZE) % GRID_SIZE;

        const z = Math.floor(index / (GRID_SIZE * GRID_SIZE));

        return {
            x,
            y,
            z
        };

    }

    /* ============================================================
       HELPERS
    ============================================================ */

    function clamp(value, min, max) {

        return Math.max(min, Math.min(max, value));

    }

    function inGrid(x, y, z) {

        return (
            x >= 0 &&
            y >= 0 &&
            z >= 0 &&
            x < GRID_SIZE &&
            y < GRID_SIZE &&
            z < GRID_SIZE
        );

    }

    /* ============================================================
       PUBLIC API
    ============================================================ */

    return {

        GRID_SIZE,

        POS_ALPHABET,

        BASE71_ALPHABET,

        POS_LOOKUP,

        BASE71_LOOKUP,

        isValidPosCharacter,

        isValidBase71Character,

        encodeNumber,

        decodeNumber,

        encodePosition,

        decodePosition,

        clamp,

        inGrid

    };

})();
/* ============================================================
   COLORS
============================================================ */

function encodeColor(r, g, b) {

    r = clamp(Math.round(r), 0, 255);
    g = clamp(Math.round(g), 0, 255);
    b = clamp(Math.round(b), 0, 255);

    const index =
        r +
        (g * 256) +
        (b * 256 * 256);

    return (
        POS_ALPHABET[(index >> 0) & 63] +
        POS_ALPHABET[(index >> 6) & 63] +
        POS_ALPHABET[(index >> 12) & 63] +
        POS_ALPHABET[(index >> 18) & 63]
    );

}

function decodeColor(encoded) {

    if (encoded.length !== 4)
        throw new Error("Color must be exactly 4 characters.");

    let index = 0;

    index |= POS_LOOKUP[encoded[0]];
    index |= POS_LOOKUP[encoded[1]] << 6;
    index |= POS_LOOKUP[encoded[2]] << 12;
    index |= POS_LOOKUP[encoded[3]] << 18;

    return {

        r: index & 255,

        g: (index >> 8) & 255,

        b: (index >> 16) & 255

    };

}

/* ============================================================
   ROTATIONS
============================================================ */

const ROTATIONS = {

    PLUS_Z: "A",
    PLUS_Y: "B",
    MINUS_Y: "D",
    PLUS_X: "E",
    MINUS_X: "M",
    MINUS_Z: "o"

};

const ROTATION_LOOKUP = {};

for (const key in ROTATIONS)
    ROTATION_LOOKUP[ROTATIONS[key]] = key;

function encodeRotation(name) {

    return ROTATIONS[name] ?? "A";

}

function decodeRotation(letter) {

    return ROTATION_LOOKUP[letter] ?? "PLUS_Z";

}

/* ============================================================
   MATERIALS
============================================================ */

const MATERIALS = {

    Default: "",
    Glass: "2",
    "Diamond Plate": "3",
    Fabric: "4",
    Grass: "5",
    Ice: "6",
    Sand: "7",
    Wood: "8",
    "Wooden Planks": "9",
    Foil: "a",
    Metal: "b",
    Brick: "c",
    Concrete: "d",
    Cobblestone: "e",
    Marble: "f",
    Granite: "g",
    Slate: "h",
    "Corroded Metal": "i",
    "Force Field": "j"

};

const MATERIAL_LOOKUP = {};

for (const name in MATERIALS)
    MATERIAL_LOOKUP[MATERIALS[name]] = name;

function encodeMaterial(name) {

    return MATERIALS[name] ?? "";

}

function decodeMaterial(code) {

    return MATERIAL_LOOKUP[code] ?? "Unknown";

}

/* ============================================================
   WORLD IDS
============================================================ */

function encodeWorldID(id) {

    if (typeof id === "number")
        return encodeNumber(id);

    return String(id);

}

function decodeWorldID(id) {

    if (!id)
        return "";

    return id;

}

/* ============================================================
   COMPONENT ID HELPERS
============================================================ */

/*
Handles

G
X
#d
#!
%k
"
'
etc.
*/

function readComponentID(text, offset = 0) {

    const c = text[offset];

    if (!c)
        return null;

    if (c === "#" || c === "%") {

        return {

            id: c + text[offset + 1],

            length: 2

        };

    }

    return {

        id: c,

        length: 1

    };

}

/* ============================================================
   SAVE VALIDATION
============================================================ */

function isValidPositionString(text) {

    if (text.length !== 4)
        return false;

    for (const c of text)

        if (!isValidPosCharacter(c))
            return false;

    return true;

}

function isValidColorString(text) {

    return isValidPositionString(text);

}

function isValidWorldID(text) {

    for (const c of text)

        if (!isValidBase71Character(c))
            return false;

    return true;

}

/* ============================================================
   PUBLIC API EXTENSIONS
============================================================ */

Object.assign(Base71, {

    encodeColor,

    decodeColor,

    encodeRotation,

    decodeRotation,

    encodeMaterial,

    decodeMaterial,

    encodeWorldID,

    decodeWorldID,

    readComponentID,

    isValidPositionString,

    isValidColorString,

    isValidWorldID,

    ROTATIONS,

    ROTATION_LOOKUP,

    MATERIALS,

    MATERIAL_LOOKUP

});
