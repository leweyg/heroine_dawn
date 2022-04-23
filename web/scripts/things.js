
var dawnThings_prototype = {
    encounterRecivesInput : function(game,encounter,act) {
        var avatar = game.state.avatar;
        if ((encounter.type == "chest") || (encounter.stat=="gold") || (encounter.type=="sleep")) {
            game.state.encounter = null; // hide encounter after input
            return false;
        }
        if (encounter.type == "note") {
            game.state.encounter = null; // hide encounter after input
            return true;
        }
        if (encounter.type == "enemy") {
            var enem = game.getRef(encounter.ref);
            if (act.startsWith("cast[")) {
                var ndx = 1 * act.replace("cast[","").replace("]","");
                var spell = game.world.equipment.spells[ndx];
                if (ndx == 1) {
                    game.castHealMagic();
                } else if (spell.atk) {
                    // combat magic:
                    if (avatar.mp < 1) {
                        game.latest_status = "Not enough mp.";
                        return true;
                    }
                    avatar.mp--;
                    var atk = spell.atk;
                    var msg = "Cast " + spell.name;
                    if (spell.category_bonus == enem.category) {
                        atk *= 2;
                        msg += " x2 damage";
                    }
                    msg += "...\n";
                    this.deliverCombatDamage(game,atk,msg);
                } else {
                    game.latest_status = "Can't use " + spell.name + " now.";
                }
                return true;
            }
            if (act == "avoid") {
                var gold = game.nextRandomMinMax(enem.gold_min, enem.gold_max);
                game.latest_status = "Avoided conflict. Got $" + gold;
                this.recieveGold(game,gold);
                return true;
            }
            if (encounter.phase == 0) {
                game.latest_status = "Missed, too early.";
                return true;
            }
            if (encounter.phase == 2) {
                game.latest_status = "Missed, too late.";
                return true;
            }
            console.assert(encounter.phase == 1);
            if (true) {
                var avatar = game.state.avatar;
                var weapon = game.world.equipment.weapons[avatar.weapon];
                
                var atk = game.nextRandomMinMax(weapon.atk_min,weapon.atk_max) + avatar.bonus_atk;
                atk = Math.max(1,atk);
                this.deliverCombatDamage(game,atk);
            }
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
                    if (item.type == "room") {
                        avatar.hp = avatar.max_hp;
                        avatar.mp = avatar.max_mp;
                        if (avatar.gold >= item.value) {
                            avatar.gold -= item.value;
                        }
                        game.latest_status = "Slept in room. HP/MP restored.";
                        return true;
                    }
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
                        game.state.menu_open = true;
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
    recieveGold : function(game,gold) {
        var avatar = game.state.avatar;
        avatar.gold += gold;
        game.state.encounter = {
            "type":"chest",
            "stat":"gold",
            "ref":"world.equipment.treasures[2]",
        };
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
            if (thing.already_got) {
                game.latest_status = "Empty";
                game.state.encounter = null;
                return true;
            }
            thing.already_got = true;
            game.state.tile_changes.push({
                map_id : game.state.avatar.map_id,
                thing_index : thing.index,
                already_got : true,
            });
            if (treasure.stat == "gold") {
                game.state.avatar.gold += thing.count;
                game.latest_status = "Recieved " + thing.count + " gold!";
                return true;
            }
            game.latest_status = "Got " + treasure.name;
            if (treasure.add) {
                console.assert(treasure.stat in game.state.avatar);
                var max_stat = "max_" + treasure.stat;
                if (max_stat in game.state.avatar) {
                    game.state.avatar[max_stat] += treasure.add;
                }
                game.state.avatar[treasure.stat] += treasure.add;
            } else if (treasure.min_value) {
                if (game.state.avatar[treasure.stat] < treasure.min_value) {
                    game.state.avatar[treasure.stat] = treasure.min_value;
                }
            } else console.assert(false);
            return true;
        }
        if (thing.type == "enemy") {
            game.startBattle(thing.enemy_id);
            return true;
        }
        if ((thing.type == "locked_door") || (thing.type == "bones")) {
            return true; // all good, already walked in
        }
        game.latest_status = "TODO: thing of type: " + thing.type;
        return true;
    },
    deliverCombatDamage : function(game,atk,prefix="") {
        var encounter = game.state.encounter;
        var enem = game.getRef(encounter.ref);
        atk = Math.max(1,atk);
        var hp = encounter.hp - atk;
        if (hp <= 0) {
            var gold = game.nextRandomMinMax(enem.gold_min, enem.gold_max);
            game.latest_status = prefix + "Tamed. Got $" + gold;
            if (enem.extra == "dspeak") {
                game.state.avatar.tamer = true;
                game.latest_status += "\nYou are a tamer now.";
            }
            this.recieveGold(game,gold);
            return true;
        } else {
            var firstHp = encounter.hp;
            encounter.hp = hp;
            encounter.phase = 0;
            encounter.phase_time = 0;
            encounter.phase_duration = game.battleCalcPhaseDuration(encounter);
            game.latest_status = prefix + "Target" + "-" + atk + "=" + hp + " hp";
            return true;
        }
    },
};
var dawnThings = new Object(dawnThings_prototype);
