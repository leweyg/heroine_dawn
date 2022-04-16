
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
};

var dawnGame = new Object(dawnGame_prototype);

