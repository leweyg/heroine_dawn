
var dawnGame_prototype = {
    world : null,
    state : {
        avatar : null,
        encounter : null,
    },
    latest_status : "Loading...",
    initFromWorld : function(world) {
        this.world = world;
        this.state = {
            avatar : new Object(world.avatar),
        };
        this.latest_status = "First step...";
    },
    doInput : function(act) {
        this.latest_status = "";
        this.onInnerAction(act);
        this.onChanged();
    },
    onInnerAction : function(act) {
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
                }
                break;
            case "left":
            case "right":
                {
                    var dirs = this.world.rendering.directions_right;
                    var ndx = dirs.indexOf(avatar.facing);
                    if (act == "right") ndx += 1;
                    if (act == "left") ndx += (dirs.length - 1);
                    ndx = (ndx % dirs.length);
                    avatar.facing = dirs[ndx];
                }
                break;
        }
    },
    onChanged : function() {
        // replaced by renderer
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
};

var dawnGame = new Object(dawnGame_prototype);

