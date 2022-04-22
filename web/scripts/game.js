
var dawnGame_prototype = {
    world : null,
    state : {
        avatar : null,
    },
    latest_status : "Loading...",
    initFromWorld : function(world) {
        this.world = world;
        this.state = {
            avatar : new Object(world.avatar),
            encounter : null,
            tile_changes : [],
            random_index : 0,
            menu_open : false,
            encounter_rate : 0.15,
        };
        this.latest_status = "First step...";
        var msg = "";
        for (var i in this.world.intro_note) {
            msg += this.world.intro_note[i] + "\n";
        }
        this.latest_status = msg;
    },
    doInput : function(act,isPreview) {
        this.latest_status = "";
        this.innerAction(act,isPreview);
        this.onChanged();
    },
    doTimeTick : function() {
        if (!this.isBattle()) return;
        if (this.state.menu_open) return; // stop time
        this.battleTick();
    },
    innerAction : function(act,isPreview) {
        if (isPreview) {
            return;
        }
        if (act == "menu") {
            this.state.menu_open = !this.state.menu_open;
            return;
        }
        if (this.state.menu_open) {
            this.state.menu_open = false;
            return;
        }
        if (this.state.encounter) {
            if (dawnThings.encounterRecivesInput(this,this.state.encounter,act)) {
                return;
            }
        }
        if (act.startsWith("cast[")) {
            this.castMagicInWorld(act);
            return;
        }
        var avatar = this.state.avatar;
        switch (act) {
            case "up":
            case "center":
                {
                    var fwd = this.getTileInfoAvatarForward();
                    if (!fwd) {
                        this.latest_status = "Nothing there";
                        return;
                    }
                    var walkable = this.world.tile_types[fwd.tile_type].walkable;
                    if (!walkable) {
                        this.latest_status = "Can't walk there.";
                        return;
                    }
                    var things = this.findTileThingsByMapXY(avatar.map_id,fwd.x,fwd.y);
                    for (var i in things) {
                        if (!dawnThings.walkIntoThing(this,things[i])) return;
                    }
                    // do the walk:
                    avatar.x = fwd.x;
                    avatar.y = fwd.y;
                    this.checkForRandomEncounter(things);
                }
                break;
            case "left":
            case "right":
                {
                    var dr = 0;
                    if (act == "right") dr = 1;
                    if (act == "left") dr = -1;
                    this.rotateAvatar(dr);
                }
                break;
        }
    },
    rotateAvatar : function(dAngle) {
        var avatar = this.state.avatar;
        var dirs = this.world.rendering.directions_right;
        var ndx = dirs.indexOf(avatar.facing);
        ndx += (dAngle + dirs.length);
        ndx = (ndx % dirs.length);
        avatar.facing = dirs[ndx];
        console.assert(avatar.facing);
    },
    checkForRandomEncounter : function(things) {
        var avatar = this.state.avatar;
        if ((things.length == 0) && (!this.state.encounter)) {
            var map = this.world.maps[avatar.map_id];
            if (map.enemies.length > 0) {
                var r = this.nextRandomFloat();
                if (r > this.state.encounter_rate) return;
                var enemId = this.nextRandomIndexOf(map.enemies.length); // TODO: make random
                enemId = map.enemies[enemId];
                this.startBattle(enemId);
            }
        }
    },
    castHealMagic : function() {
        if (this.state.avatar.mp == 0) {
            this.latest_status = "Not enough MP";
            return;
        }
        if (this.state.avatar.hp >= this.state.avatar.max_hp) {
            this.latest_status = "Already full HP";
            return;
        }
        this.state.avatar.mp--;
        this.state.avatar.hp = this.state.avatar.max_hp;
        this.latest_status = "Healed yourself";
        return;
    },
    castMagicInWorld : function(act) {
        var ndx = 1*(act.replace("cast[","").replace("]",""));
        var spell = this.world.equipment.spells[ndx];
        if (this.state.avatar.mp == 0) {
            this.latest_status = "Not enough MP";
            return;
        }
        if (ndx == 1) {
            this.castHealMagic();
            return;
        }
        if (spell.tile_from) {
            var tile = this.getTileInfoAvatarForward();
            if (tile && (tile.tile_type == spell.tile_from)) {
                this.state.avatar.mp--;
                tile.tile_type = spell.tile_to;
                tile.map_id = this.state.avatar.map_id;
                this.state.tile_changes.push(dawnUtils.cloneDeep(tile));
                this.world.maps[tile.map_id].tiles[tile.y][tile.x] = spell.tile_to;
                this.latest_status = "Cast " + spell.name;
                return;
            } else {
                this.latest_status = "Can't use " + spell.name + " here.";
                return;
            }
        }
        
        this.latest_status = "Can't use " + spell.name + " here.";
        return;
    },
    startBattle : function(enemId) {
        var enem = this.world.enemies[enemId];
        var enc = {
            type:"enemy",
            enemy_id:enemId,
            extra:"",
            hp:enem.hp,
            phase:0,
            phase_time:20,
            ref:"world.enemies[" + enemId + "]",
        };
        var prefix = this.battleIsTamed() ? "Tamed " : "";
        this.latest_status = prefix + enem.name;
        this.state.encounter = enc;
    },
    battleTick : function() {
        var enc = this.state.encounter;
        console.assert(enc.phase_time != undefined);
        enc.phase_time++;
        if (!enc.phase_duration) {
            var first_dur_extra = 10;
            enc.phase_duration = this.battleCalcPhaseDuration(enc) + first_dur_extra;
        }
        if (enc.phase_time >= enc.phase_duration) {
            this.battlePhaseChanged(enc);
            this.onChanged();
        }
    },
    battleCalcPhaseDuration : function(enc) {
        var times_per_phase_min = [
            5, 3, 2 // idle, wind-up, strike
        ];
        var times_per_phase_max = [
            40, 10, 5 // idle, wind-up, strike
        ];
        var dur = this.nextRandomMinMax(times_per_phase_min[enc.phase], times_per_phase_max[enc.phase]);
        return dur;
    },
    battlePhaseChanged : function(enc) {
        enc.phase_time = 0;
        enc.phase = (enc.phase + 1) % 3;
        enc.phase_duration = this.battleCalcPhaseDuration(enc);
        // start of phase:
        if (enc.phase == 1) { // tell
            if (this.battleIsTamed()) {
                this.latest_status = "windup...";
            }
        }
        if (enc.phase == 2) { // enemy attack
            var avatar = this.state.avatar;
            var enem = this.getRef(enc.ref);
            var atk = this.nextRandomMinMax(enem.atk_min,enem.atk_max);
            atk -= this.world.equipment.armors[avatar.armor].def;
            atk = Math.max(1,atk);
            if (!this.battleIsTamed()) {
                avatar.hp = Math.max(0,avatar.hp-atk);
                this.latest_status = "You-" + atk + " hp";
            } else {
                this.latest_status = "Would be -" + atk + " hp";
            }
        }
    },
    battleIsTamed : function() {
        var mapTamed = this.world.maps[this.state.avatar.map_id].tamed;
        return (mapTamed || this.state.avatar.tamer);
    },
    callOnChanged : [], // register renderer here
    onChanged : function() {
        for (var i in this.callOnChanged) {
            this.callOnChanged[i]();
        }
    },
    // General API:
    getRef : function(path) {
        var obj = dawnUtils.parsePath(this, path);
        console.assert(obj);
        return obj;
    },
    isBattle : function() {
        var enc = this.state.encounter;
        if (enc && (enc.type == "enemy")) {
            return true;
        }
        return false;
    },
    isBattleInTell : function() {
        if (!this.isBattle()) return;
        var enc = this.state.encounter;
        return enc.phase == 1;
    },
    // Tile API:
    _tempTile : { x:0, y:0, tile_type:null },
    getTileInfoAvatar : function() {
        var avatar = this.state.avatar;
        return this.getTileInfoByMapXY(avatar.map_id,avatar.x,avatar.y);
    },
    getTileInfoAvatarForward : function() {
        var avatar = this.state.avatar;
        var fwd = this.world.rendering.transform_by_direction[avatar.facing];
        return this.getTileInfoByMapXY(avatar.map_id,avatar.x+fwd.fx,avatar.y+fwd.fy);
    },
    getTileInfoByXY : function(x,y) {
        var avatar = this.state.avatar;
        return this.getTileInfoByMapXY(avatar.map_id,x,y);
    },
    getTileInfoByMapXY : function(map_id,x,y) {
        var map = this.world.maps[map_id];
        var ans = this._tempTile;
        if ((x >= 0) && (x < map.width) && (y >= 0) && (y < map.height)) {
            ans.tile_type = map.tiles[y][x];
        } else {
            return undefined;
        }
        ans.x = x;
        ans.y = y;
        return ans;
    },
    // Thing API:
    _tempThings : [],
    findTileThingsByMapXY : function(map_id,x,y) {
        var map = this.world.maps[map_id];
        var res = this._tempThings;
        res.length = 0;
        for (var i in map.things) {
            var thing = map.things[i];
            if ((thing.x == x) && (thing.y == y)) {
                res.push(thing);
            }
        }
        return res;
    },
    // Utilities:
    _randomData : [
        0.43640365955131566,
        0.5964836953736707,
        0.3886297842699591,
        0.10369645118360982,
        0.37020995057682615,
        0.1712446732478794,
        0.9360675340040041,
        0.607374831583281,
        0.36830546455084034,
        0.10623656121536729,
        0.6237983530336981,
        0.1672824240816424,
        0.45978483596642983,
        0.7165480740530841,
        0.8513705856908667,
        0.9139904414326847,
        0.2777518588455756,
        0.014266571625454416,
        0.45275654986425806,
        0.45656645513475524,
        0.14643015082789446,
        0.18205338671188853,
        0.8659052654630621,
        0.05457806530524323,
        0.3730290602790758,
        0.0402689393545117,
        0.25319899147195524,
        0.3873272136433141,
        0.7713847041870872
      ],
    nextRandomFloat : function() {
        var useFixedData = false;
        if (!useFixedData) {
            return Math.random();
        } else {
            var cur = ((this.state.random_index + 1) % this._randomData.length);
            this.state.random_index = cur;
            var r = this._randomData[cur];
            return r;
        }
    },
    nextRandomIndexOf : function(length) {
        var r = this.nextRandomFloat() * length;
        return Math.floor(r);
    },
    nextRandomMinMax : function(min,max) {
        var len = (max-min)+1; // inclusive
        var r = this.nextRandomFloat() * len;
        return Math.floor(r) + min;
    },
};

var dawnGame = new Object(dawnGame_prototype);

