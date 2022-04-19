
var dawnThings_prototype = {
    walkIntoThing : function(game,thing) {
        if (thing.type == "exit") {
            game.state.avatar.x = thing.dest_x;
            game.state.avatar.y = thing.dest_y;
            game.state.avatar.map_id = thing.dest_map;
            game.latest_status = "" + game.world.maps[game.state.avatar.map_id].name;
            return false;
        }
        if (thing.type == "chest") {
            game.state.encounter = thing;
            var treasure = game.world.equipment.treasures[ thing.treasure_id ];
            if (treasure.stat == "gold") {
                game.state.avatar.gold += thing.count;
                game.latest_status = "Recieved " + thing.count + " gold!";
                return true;
            }
            game.latest_status = "Got " + treasure.name;
            if (treasure.add) {
                game.state.avatar[treasure.stat] += treasure.add;
            } else if (treasure.min_value) {
                if (game.state.avatar[treasure.stat] < treasure.min_value) {
                    game.state.avatar[treasure.stat] = treasure.min_value;
                }
            } else console.assert(false);
            return true;
        }
        game.latest_status = "TODO: thing of type: " + thing.type;
        return true;
    },
};
var dawnThings = new Object(dawnThings_prototype);