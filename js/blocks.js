/*
========================================
 Build Logic Save Editor
 blocks.js
========================================
*/

let BLOCKS = {};

/*
Load ItemsList.json from root directory
*/
async function loadBlocks() {

    try {

        const response = await fetch("https://azwqxr.github.io/bl-save-editor/ItemsList.json");

        if (!response.ok) {
            throw new Error(
                `Failed to load ItemsList.json (${response.status})`
            );
        }

        BLOCKS = await response.json();

        console.log(
            "Loaded",
            Object.keys(BLOCKS).length,
            "blocks"
        );

    } catch (error) {

        console.error(
            "Could not load ItemsList.json:",
            error
        );

    }

}


/*
Get block information by ID
*/
function getBlock(id) {

    return BLOCKS[id] || {
        name: "Unknown",
        category: "Unknown"
    };

}


/*
Get ID from block name
*/
function getBlockID(name) {

    for (const id in BLOCKS) {

        if (BLOCKS[id].name === name)
            return id;

    }

    return null;

}


/*
Get all blocks sorted alphabetically
*/
function getAllBlocks() {

    return Object.entries(BLOCKS)
        .map(([id, data]) => ({
            id,
            ...data
        }))
        .sort((a, b) =>
            a.name.localeCompare(b.name)
        );

}


/*
Automatically load on startup
*/
loadBlocks();
