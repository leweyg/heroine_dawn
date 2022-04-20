
var dawnThings_prototype = {
    encounterRecivesInput : function(game,encounter,act) {
        var avatar = game.state.avatar;
        if ((encounter.type == "chest") || (encounter.stat=="gold") || (encounter.type=="sleep")) {
            game.state.encounter = null; // hide encounter after input
            return false;
        }
        if (encounter.type == "enemy") {

            game.state.encounter = null; // end battle for now
            return true;
        }
        if ((encounter.type == "person")) {
            if ((act=="left")||(act=="right")) {
                var person = game.world.people[encounter.person_id];
                var ndx = ((act=="left")?0:1);
                var item = null;
                if (ndx < person.item.length) {
                    item = person.item[ndx];
                    if (item.type == "message") item = null;
                }
                if (item) {
                    // try buy it:
                    item = game.getRef(item.ref);
                    var index = item.index;
                    var stat = item.type;
                    if (stat == "spell") stat = "spellbook";
                    console.assert(stat in avatar);
                    var curVal = avatar[stat];
                    if (curVal < index) {
                        var prefix = "Bought ";
                        if (avatar.gold < item.gold) {
                            if (!item.begged) {
                                item.begged = true;
                                game.latest_status = "Not enough. Beg?";
                                return true;
                            } else {
                                prefix = "Was given ";
                                avatar.gold += item.gold;
                            }
                        }
                        avatar.gold -= item.gold;
                        avatar[stat] = index;
                        game.latest_status = prefix + item.name;
                    } else {
                        game.latest_status = "No downgrades.";
                    }
                    return true; // stay on this screen
                }
            }
            game.state.encounter = null; // now let them go
            return true; // input was recieved
        }
        console.assert("TODO: encounter input of type: " + encounter.type);
    },
    walkIntoThing : function(game,thing) {
        if (thing.type == "exit") {
            var nextMap = game.getRef(thing.ref);
            game.state.avatar.x = thing.dest_x;
            game.state.avatar.y = thing.dest_y;
            game.state.avatar.map_id = thing.dest_map;
            game.latest_status = nextMap.name;
            return false;
        }
        if (thing.type == "person") {
            var person = game.getRef(thing.ref);
            game.state.encounter = thing;
            game.latest_status = person.name;
            game.rotateAvatar(2); // turn them around
            return false;
        }
        if (thing.type == "sleep") {
            game.state.encounter = thing;
            game.latest_status = "Slept. HP/MP restored.";
            game.state.avatar.hp = game.state.avatar.max_hp;
            game.state.avatar.mp = game.state.avatar.max_mp;
            return true;
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
