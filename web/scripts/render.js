

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
        this.drawHUD();
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
    drawHUD : function() {
        var infoSheetIndex = this.world.rendering.sheets_by_name["info_icon"];
        var infoSheet = this.world.rendering.sheets[infoSheetIndex];
        this.mainContext.globalAlpha = 0.2;
        this.drawSheetIndex(infoSheet, 0);
        this.mainContext.globalAlpha = 1;

        if (this.game.state.encounter) {
            var avatar = this.game.state.avatar;
            this.drawStringAligned("hp " + avatar.hp, 1, 1);
            this.drawStringAligned("mp " + avatar.mp, -1, 1);
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
        this.drawStringAtXY(this.game.latest_status, 1, 1);

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
    drawStringAligned : function(str,alignX=0,alignY=0) {
        var font = this.world.font;
        var h = font.height;
        var sh = this.world.rendering.screen.height - 2;
        var sw = this.world.rendering.screen.width - 3;

        var y = 0;
        if (alignY == 0) y = (sh/2) - (h/2);
        if (alignY > 0) y = sh - h;

        var w = this.measureStringWidth(str);
        var x = 0;
        if (alignX == 0) x = (sw / 2) - (w/2);
        if (alignX > 0) x = sw - w;

        this.drawStringAtXY(str, 1+x, 1+y);
    },
    drawStringAtXY : function(str,x=0,y=0) {
        var fontImg = this.images.font.tryGetImg();
        if (!fontImg) return;
        var font = this.world.font;
        for (var i=0; i<str.length; i++) {
            var raw = str.charAt(i);
            var ndx = font.glyph.indexOf(raw);
            if (ndx < 0) ndx = 2;
            var w = this.drawCharAtXY(str.charAt(i), x, y);
            x += w + font.kerning;
        }
    },
    glyphIndex : function(letter) {
        var ndx = this.world.font.glyph.indexOf(letter.toUpperCase());
        if ((ndx < 0) || (ndx >= this.world.font.glyph.length)) {
            ndx = 2; // missing character
        }
        return ndx;
    },
    drawCharAtXY : function(letter, x, y) {
        var font = this.world.font;
        if (letter == ' ') return font.space;

        var ndx = this.glyphIndex(letter);
        var src_x = font.start[ndx];
        var w = font.width[ndx];
        var h = font.height;

        var fontImg = this.images.font.tryGetImg();
        if (!fontImg) return;
        this.mainContext.drawImage(fontImg, 
            src_x, 0, w, h,
            x, y, w, h);

        return w;
    },
    glyphWidth : function(letter) {
        if (letter == ' ') return this.world.font.space;
        var ndx = this.glyphIndex(letter);
        var w = this.world.font.width[ndx];
        return w;
    },
    measureStringWidth : function(str) {
        var w = 0;
        for (var i=0; i<str.length; i++) {
            w += this.glyphWidth(str.charAt(i)) + this.world.font.kerning;
        }
        return w;
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


