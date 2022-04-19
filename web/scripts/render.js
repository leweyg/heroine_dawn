

var dawnRenderer_prototype = {
    world : null,
    game : null,
    mainCanvas : null,
    mainContext : null,
    mainStatus : null,
    images : {
        backgrounds : [],
        tiles : [],
    },
    initFromGameWorld : function(game, world, mainTarget, mainStatus) {
        this.game = game;
        this.world = world;
        this.mainCanvas = mainTarget;
        this.mainContext = this.mainCanvas.getContext("2d");
        this.mainStatus = mainStatus;

        for (var i in world.backgrounds) {
            this.images.backgrounds[i] = this.preloadImage(world.backgrounds[i].src);
        }
        for (var i in world.tile_types) {
            var src = world.tile_types[i].src;
            if (src) {
                this.images.tiles[i] = this.preloadImage(src);
            }
        }

        var _this = this;
        this.game.onChanged = (() => { _this.redraw(); });
    },
    redraw : function() {
        if (!this.game) return;

        this.drawScene();
        this.drawEncounter();
        this.udpateStatus();
    },
    drawScene : function() {
        var avatar = this.game.state.avatar;
        var map = this.world.maps[avatar.map_id];

        // background:
        var bgImg = this.images.backgrounds[map.background];
        this.mainContext.drawImage(bgImg, 0, 0);
        // visible cells:
        var cells = this.world.rendering.visible_cells_north;
        var parts = this.world.rendering.tile_parts_by_visible_cell;
        
        for (var ci in cells) {
            var cell = cells[ci];
            var tile = this.getTileInfoForCell(cell);
            if (tile === undefined) continue;

            var part = parts[ci];
            var tileImg = this.images.tiles[tile.tile_type];
            if (!tileImg || !tileImg.complete) continue;
            this.mainContext.drawImage(tileImg, 
                part.src_x,  part.src_y,  part.width, part.height,
                part.dest_x, part.dest_y, part.width, part.height);
        }
    },
    drawEncounter : function() {
        var encounter = this.game.state.encounter;
        if (!encounter) {
            return;
        }
        if (encounter.type == "person") {
            var person = this.game.world.people[encounter.person_id];
            var bgImg = this.images.backgrounds[person.background];
            this.mainContext.drawImage(bgImg, 0, 0);
        }
    },
    udpateStatus : function() {
        var msg = this.game.latest_status;
        this.mainStatus.innerText = msg;
    },
    
    transformCellOffset : function(t, dx, dy) {
        switch (t) {
            case "+x": return  1*dx;
            case "-x": return -1*dx;
            case "+y": return  1*dy;
            case "-y": return -1*dy;
            default: throw "What?";
        }
    },
    getTileInfoForCell : function(cell) {
        var avatar = this.game.state.avatar;
        var transform = this.world.rendering.transform_by_direction[avatar.facing];

        var dx = this.transformCellOffset(transform.tx, cell.dx, cell.dy);
        var dy = this.transformCellOffset(transform.ty, cell.dx, cell.dy);

        var x = avatar.x + dx;
        var y = avatar.y + dy;
        return this.game.getTileInfoByMapXY(avatar.map_id,x,y);
    },
    preloadImage : function(src) {
        var _this = this;
        var img = new Image();
        img.src = src;
        img.onload = (() => {
            _this.redraw();
        });
        return img;
    }
};

var dawnRenderer = new Object(dawnRenderer_prototype);


