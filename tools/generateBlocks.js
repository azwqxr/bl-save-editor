const fs = require("fs");

const items = JSON.parse(fs.readFileSync("ItemsList.json", "utf8"));

const blocks = {};

for (const key of Object.keys(items)) {
    const item = items[key];

    blocks[item.id] = {
        name: item.name,
        desc: item.desc || "",
        users: item.users || []
    };
}

const output = `/*
 Auto-generated from ItemsList.json
 Do not edit manually.
*/

const BLOCKS = ${JSON.stringify(blocks, null, 4)};

const BLOCK_IDS = Object.keys(BLOCKS).sort((a,b)=>b.length-a.length);

function getBlock(id){
    return BLOCKS[id] || {
        name:"Unknown",
        desc:"",
        users:[]
    };
}

function getBlockID(name){
    for(const id in BLOCKS){
        if(BLOCKS[id].name===name)
            return id;
    }
    return null;
}

`;

fs.writeFileSync("js/blocks.js", output);

console.log("Generated js/blocks.js");
