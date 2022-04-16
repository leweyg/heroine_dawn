

var dawnRenderer_prototype = {
    world : null,
    game : null,
    mainCanvas : null,
    mainContext : null,
    images : {
        backgrounds : [],
        tiles : [],
    },
    initFromGameWorld : function(game, world, mainTarget) {
        this.game = game;
        this.world = world;
        this.mainCanvas = mainTarget;
        this.mainContext = this.mainCanvas.getContext("2d");

        for (var i in world.backgrounds) {
            this.images.backgrounds[i] = this.preloadImage(world.backgrounds[i].src);
        }
        for (var i in world.tile_types) {
            this.images.tiles[i] = this.preloadImage(world.tile_types[i].src);
        }
    },
    redraw : function() {
        if (!this.game) return;

        this.drawScene();
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
            if (tile.tile_type === undefined) continue;

            var part = parts[ci];
            var tileImg = this.images.tiles[tile.tile_type];
            this.mainContext.drawImage(tileImg, 
                part.src_x,  part.src_y,  part.width, part.height,
                part.dest_x, part.dest_y, part.width, part.height);
        }
    },
    _tempTile : { x:0, y:0, tile_type:null },
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
        var ans = this._tempTile;
        var avatar = this.game.state.avatar;
        var map = this.world.maps[avatar.map_id];
        var transform = this.world.rendering.transform_by_direction[avatar.facing];

        var dx = this.transformCellOffset(transform.x, cell.dx, cell.dy);
        var dy = this.transformCellOffset(transform.y, cell.dx, cell.dy);

        var x = avatar.x + dx;
        var y = avatar.y + dy;
        if ((x >= 0) && (x < map.width) && (y >= 0) && (y < map.height)) {
            ans.tile_type = map.tiles[y][x];
        } else {
            ans.tile_type = undefined;
        }
        ans.x = x;
        ans.y = y;
        return ans;
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


