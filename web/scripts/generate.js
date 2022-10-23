

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
            if (!(type.model)) {
                console.log("Missing model for tile type: " + type.name);
                continue;
            }
            var cell = {
                name : type.name,
                source : type.model.replace("models/",""),
                position : [ rowIndex*2, 0, -colIndex*2 ],
            }
            scene.children.push(cell);
        }
    }
    return scene;
}

var mapJson = exportMapToScene(world.maps[1]);
mapJson.metadata = {type:"lewcid_object"};
var mapText = JSON.stringify(mapJson,null,2);
fs.writeFileSync("web/models/map_out.json",mapText);

console.log("Done.");
