/*
========================================
 Build Logic Save Editor
 blocks.js
========================================
*/

const BLOCKS = {

    // Building

    "G": { name: "Block", category: "Building" },
    "H": { name: "Stair", category: "Building" },
    "I": { name: "Ladder", category: "Building" },
    "J": { name: "Torch", category: "Building" },
    "L": { name: "Slab", category: "Building" },
    "M": { name: "Inner Stair", category: "Building" },
    "N": { name: "Outer Stair", category: "Building" },
    "Q": { name: "Plate", category: "Building" },
    "+": { name: "Door", category: "Building" },
    "=": { name: "Electric Door", category: "Building" },
    "[": { name: "Sticky Piston", category: "Building" },
    "]": { name: "TNT", category: "Building" },
    "{": { name: "Empty Block", category: "Building" },
    "/": { name: "Corner Pane", category: "Building" },
    ":": { name: "Pane", category: "Building" },
    ",": { name: "Chair", category: "Building" },

    // Logic

    "1": { name: "AND Gate", category: "Logic" },
    "b": { name: "NAND Gate", category: "Logic" },
    "c": { name: "NOR Gate", category: "Logic" },
    "d": { name: "NOT Gate", category: "Logic" },
    "e": { name: "OR Gate", category: "Logic" },
    "2": { name: "XOR Gate", category: "Logic" },
    "g": { name: "XNOR Gate", category: "Logic" },
    "f": { name: "Splitter", category: "Logic" },

    // Counters

    "h": { name: "Counter", category: "Counters" },
    "i": { name: "8 Bit Shifter Counter", category: "Counters" },
    ".": { name: "4 Bit Shifter Counter", category: "Counters" },
    "j": { name: "Number Counter", category: "Counters" },
    "#A": { name: "Complex Counter", category: "Counters" },

    // Inputs

    "s": { name: "Button", category: "Inputs" },
    "u": { name: "Lever", category: "Inputs" },
    "w": { name: "Instant Button", category: "Inputs" },
    "#&": { name: "Keypad", category: "Inputs" },
    "'": { name: "Player Detector", category: "Inputs" },
    "#x": { name: "Pressure Plate", category: "Inputs" },

    // Outputs

    "Y": { name: "LED", category: "Outputs" },
    "8": { name: "Color Neon Light", category: "Outputs" },
    "0": { name: "Color Light", category: "Outputs" },
    "z": { name: "RGB Light", category: "Outputs" },

    // Utility

    "t": { name: "Sign", category: "Utility" },
    ">": { name: "Text Panel", category: "Utility" },
    "X": { name: "EEPROM", category: "Utility" },
    "#d": { name: "16 Bit EEPROM", category: "Utility" },
    "#!": { name: "HTTP Transmitter", category: "Utility" },
    "\"": { name: "Kill Module", category: "Utility" },

    // Timing

    "p": { name: "Delay", category: "Timing" },
    "q": { name: "Timer", category: "Timing" },

    // Beams

    "\x02": { name: "Beam 1x2", category: "Building" },
    "\x03": { name: "Beam 1x3", category: "Building" },
    "#b": { name: "Beam 1x4", category: "Building" },
    "\x04": { name: "Beam 1x5", category: "Building" },
    "\x05": { name: "Beam 1x6", category: "Building" },
    "#c": { name: "Beam 1x7", category: "Building" },
    "\x06": { name: "Beam 1x8", category: "Building" }

};

function getBlock(id) {

    return BLOCKS[id] || {
        name: "Unknown",
        category: "Unknown"
    };

}

function getBlockID(name) {

    for (const id in BLOCKS) {

        if (BLOCKS[id].name === name)
            return id;

    }

    return null;

}

function getAllBlocks() {

    return Object.entries(BLOCKS)
        .map(([id, data]) => ({
            id,
            ...data
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

}
