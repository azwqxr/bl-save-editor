const BLOCKS = {};

for (const key in ITEMS) {
    const item = ITEMS[key];

    BLOCKS[item.id] = item;
}
