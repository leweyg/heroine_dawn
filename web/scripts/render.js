

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

        var _this = this;
        var callback = (() => {_this.redraw();});

        this.images.backgrounds = [  ];
        for (var i in world.backgrounds) {
            this.images.backgrounds.push( this.createImageLoader(world.backgrounds[i].src, callback) );
        }
        this.images.tiles = [ ];
        for (var i in world.tile_types) {
            var src = world.tile_types[i].src;
            if (src) {
                this.images.tiles.push( this.createImageLoader(src, callback) );
            } else {
                this.images.tiles.push( {tryGetImg:(()=>{return null;}) } );
            }
        }
        this.images.sheets = [];
        for (var i in world.rendering.sheets) {
            this.images.sheets[i] = this.createImageLoader(world.rendering.sheets[i].src);
        }
        this.images.font = this.createImageLoader(world.font.src);

        
        this.game.callOnChanged.push( (() => { _this.redraw(); }) );
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
        var bgImg = this.images.backgrounds[map.background].tryGetImg();
        if (bgImg) {
            this.mainContext.drawImage(bgImg, 0, 0);
        }
        // visible cells:
        var cells = this.world.rendering.visible_cells_north;
        var parts = this.world.rendering.tile_parts_by_visible_cell;
        
        for (var ci in cells) {
            var cell = cells[ci];
            var tile = this.getTileInfoForCell(cell);
            if (tile === undefined) continue;

            var part = parts[ci];
            var tileImg = this.images.tiles[tile.tile_type].tryGetImg();
            if (!tileImg) continue;
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
        if (encounter.type == "chest") {
            var treasure = this.game.getRef(encounter.ref);
            var sheet = this.game.getRef(treasure.ref_sheet);
            this.drawSheetIndex(sheet, treasure.index);
        }
        if (encounter.type == "person") {
            var person = this.game.world.people[encounter.person_id];
            var bgImg = this.images.backgrounds[person.background].tryGetImg();
            if (bgImg) {
                this.mainContext.drawImage(bgImg, 0, 0);
            }
        }
    },
    drawSheetIndex : function(sprite, index) {
        var img = this.images.sheets[sprite.index].tryGetImg();
        if (!img) return;
        var x = sprite.start_x + (index * sprite.width);
        var y = sprite.start_y;
        this.mainContext.drawImage(img, 
            x, y, sprite.width, sprite.height,
            sprite.draw_x, sprite.draw_y, sprite.width, sprite.height);
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
    createImageLoader : function(rawSrc, callback) {
        var src = rawSrc;
        var loader = {
            src : ""+src,
            ready : false,
            img : null,
            renderer : this,
            tryGetImg : function() {
                if (!this.img) {
                    this.img = new Image();
                    this.img.src = this.src;
                    var _this = this;
                    this.img.onload = (() => {
                        _this.ready = true;
                        if (_this.renderer) _this.renderer.redraw();
                        if (callback) callback();
                    });
                }
                if (this.ready) {
                    return this.img;
                }
                return null;
            },
        };
        return loader;
    },
};

var dawnRenderer = new Object(dawnRenderer_prototype);


