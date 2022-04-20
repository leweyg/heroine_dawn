
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
            random_index : 0,
            menu_open : false,
            encounter_rate : 0.15,
        };
        this.latest_status = "First step...";
    },
    doInput : function(act) {
        this.latest_status = "";
        this.onInnerAction(act);
        this.onChanged();
    },
    onInnerAction : function(act) {
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
        var avatar = this.state.avatar;
        switch (act) {
            case "forward":
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
                var enem = this.world.enemies[enemId];
                var enc = {
                    type:"enemy",
                    enemy_id:enemId,
                    extra:"",
                    hp:enem.hp,
                    ref:"world.enemies[" + enemId + "]",
                };
                this.latest_status = enem.name;
                this.state.encounter = enc;
            }
        }
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
        var cur = this.state.random_index + 1;
        cur % this._randomData.length;
        this.state.random_index = cur;
        var r = this._randomData[cur];
        return r;
    },
    nextRandomIndexOf : function(length) {
        var r = this.nextRandomFloat() * length;
        return Math.floor(r);
    },
};

var dawnGame = new Object(dawnGame_prototype);

