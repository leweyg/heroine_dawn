

console.log("Starting...");
const fs = require('fs');
console.log("In '" + process.cwd() + "'..." );

const worldText = fs.readFileSync('web/world.json');
const world = JSON.parse(worldText);

function exportMapToScene(map) {
    var scene = {
        name : map.name,
        children : [],
    };
    for (var rowIndex in map.tiles) {
        var row = map.tiles[rowIndex];
        for (var colIndex in row) {
            var tileTypeId = row[colIndex];
            if (tileTypeId == 0) continue;
            var type = world.tile_types[tileTypeId];
            if (!(type.parts)) {
                console.log("Missing parts for tile type: " + type.name);
                continue;
            }
            var cell = {
                name : type.name,
                children : [],
                position : [ rowIndex*2, 0, -colIndex*2 ],
            }
            if (type.walkable) {
                cell.walkable = true;
            }
            for (var partIndex in type.parts) {
                var path = type.parts[partIndex];
                var p = {
                    source : path
                };
                cell.children.push(p);
            }
            scene.children.push(cell);
        }
    }
    return scene;
}

for (var mapId in world.maps) {
    var mapJson = exportMapToScene(world.maps[mapId]);
    mapJson.metadata = {type:"lewcid_object"};
    var mapText = JSON.stringify(mapJson,null,2);
    fs.writeFileSync("web/models/map_" + mapId + ".json",mapText);
}


console.log("Done.");
