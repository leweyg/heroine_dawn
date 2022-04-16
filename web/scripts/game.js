
var dawnGame_prototype = {
    world : null,
    state : {
        avatar : null,
    },
    initFromWorld : function(world) {
        this.world = world;
        this.state = {
            avatar : new Object(world.avatar),
        };
    },
    doInput : function(act) {
        var avatar = this.state.avatar;
        var render = this.world.rendering;

        switch (act) {
            case "forward":
                {
                    var fwd = this.world.rendering.transform_by_direction[avatar.facing];
                    avatar.x += fwd.fx;
                    avatar.y += fwd.fy;
                    this.onChanged();
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
                    this.onChanged();
                }
                break;
        }
    },
    onChanged : function() {
        // replaced by renderer
    },
};

var dawnGame = new Object(dawnGame_prototype);

