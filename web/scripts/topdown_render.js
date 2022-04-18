
var dawnTopDownRenderer_prototype = {
    createMapHtmlString : function(world,map_id) {
        var map = world.maps[map_id];
        var res = "<div style='position: relative; zoom:2; background-color: darkgray;";
        res += "width:" + (map.width * 16) + "px; height:" + (map.height * 16) + "px; ";
        res += "' >";
        for (var y=0; y<map.height; y++) {
            for (var x=0; x<map.width; x++) {
                var tile_type = map.tiles[y][x];
                if (tile_type == 0) continue;
                var tile = world.tile_types[tile_type];
                res += "<img src='web/" + tile.topdown_src + "' style='position: absolute;";
                res += "left:" + (16 * x) + "px; top:" + (16 * y) + "px;"
                res += "' />";
            }
        }
        res += "</div>";
        return res;
    },
};

var dawnTopDownRenderer = new Object(dawnTopDownRenderer_prototype);