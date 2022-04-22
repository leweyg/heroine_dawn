

var dawnRenderer_prototype = {
    world : null,
    game : null,
    mainCanvas : null,
    mainContext : null,
    mainStatus : null,
    timeIndex : 0,
    images : {
        backgrounds : [],
        tiles : [],
    },
    timeIndexInterval : 100,
    timeIndexPerAnim : 3,
    initFromGameWorld : function(game, world, mainTarget, mainStatus) {
        this.game = game;
        this.world = world;
        this.mainCanvas = mainTarget;
        this.mainContext = this.mainCanvas.getContext("2d");
        this.mainStatus = mainStatus;

        var _this = this;
        var callback = (() => {_this.redraw();});
        setInterval(()=>{_this.onTimeTick();}, this.timeIndexInterval);

        this.images.font = this.createImageLoader(world.font.src);
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
        this.images.enemies = [];
        for (var i in world.enemies) {
            this.images.enemies[i] = this.createImageLoader(world.enemies[i].src);
        }
        
        this.game.callOnChanged.push( (() => { _this.redraw(); }) );
    },
    redraw : function() {
        if (!this.game) return;

        this.drawScene();
        this.drawEncounter();
        this.drawAvatarInfo();
        this.drawHUD();
        this.udpateStatus();
    },
    onTimeTick : function() {
        if (!this.game) return;
        this.timeIndex++;
        if (!this.game.isBattle()) return;
        this.game.doTimeTick();
        this.redraw();
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
        if (encounter.type == "note") {
            var ctx = this.mainContext;
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(0,0,this.world.rendering.screen.width, this.world.rendering.screen.height);
    
            this.drawStringAligned(encounter.msg, -1, -1);
        }
        if (encounter.type == "chest") {
            var treasure = this.game.getRef(encounter.ref);
            var sheet = this.game.getRef(treasure.ref_sheet);
            this.drawSheetIndex(sheet, treasure.index);
        }
        if (encounter.type == "enemy") {
            var enem = this.game.getRef(encounter.ref);
            var img = this.images.enemies[encounter.enemy_id].tryGetImg();
            if (img) {
                if (enem.category == "shadow") {
                    this.mainContext.globalAlpha = 0.61;
                }
                var ndx = Math.floor(encounter.phase_time / this.timeIndexPerAnim) % enem.anim.length;
                var scl = 2;
                if (encounter.phase != 0) {
                    ndx = encounter.phase;
                    scl = 20;
                }
                var offsetName = enem.anim[ndx];
                var offset = this.world.rendering.screen_directions[offsetName];
                this.mainContext.drawImage(img, scl * offset.x, scl * offset.y);
                this.mainContext.globalAlpha = 1;
            }
        }
        if (encounter.type == "person") {
            var person = this.game.world.people[encounter.person_id];
            var bgImg = this.images.backgrounds[person.background].tryGetImg();
            if (bgImg) {
                this.mainContext.drawImage(bgImg, 0, 0);
            }
            var prefix = "";
            for (var i in person.item) {
                var item = person.item[i];
                var refData = (item.ref ? this.game.getRef(item.ref) : null);
                var msg = prefix;
                if (item.type == "message") {
                    msg += item.msg1 + '\n' + item.msg2;
                    prefix = "\n\n\n\n";
                } else if (item.type == "room") {
                    msg += "Room\n$" + item.value;
                } else if (refData) {
                    msg += refData.name + "\n$" + refData.gold;
                }
                var xAlign = ((i==0)?-1:1);
                this.drawStringAligned(msg, xAlign, 0);
            }
        }
    },
    drawAvatarInfo : function() {
        if (!this.game.state.menu_open) {
            return;
        }
        var ctx = this.mainContext;
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0,0,this.world.rendering.screen.width, this.world.rendering.screen.height);

        var avatar = this.game.state.avatar;
        this.drawSheetIndex("avatar", 0);
        this.drawSheetIndex("armor", avatar.armor);
        this.drawSheetIndex("weapon", avatar.weapon);
    },
    infoIconShowing : false,
    drawHUD : function() {
        var open = this.game.state.menu_open;
        var longer = open;
        var enc = this.game.state.encounter;
        var battle = this.game.isBattle();
        var avatar = this.game.state.avatar;
        if (enc && (enc.type == "note")) return;
        if (enc || open) {
            this.drawStringAligned(avatar.hp + (longer ? "/" + avatar.max_hp : "") + " hp", 1, 1);
            if (avatar.spellbook > 0) {
                this.drawStringAligned("mp " + avatar.mp + (longer ? "/" + avatar.max_mp : ""), -1, 1);
            }
            if (longer || (enc && enc.type=="person")) {
                this.drawStringAligned("$" + avatar.gold, 0, 1);
            }
        }
        if (battle && !open) {
            var can_attack = (this.game.isBattleInTell());
            if (!can_attack) {
                this.mainContext.globalAlpha = 0.6;
            }
            this.drawSheetIndex("attack_icon", 0);
            this.mainContext.globalAlpha = 1;
        }
        if (true) {
            if (!open) {
                this.mainContext.globalAlpha = 0.2;
            }
            var stateIndex = this.game.state.menu_open ? 1 : 0;
            this.drawSheetIndex("info_icon", stateIndex);
            
            for (var i=1; i<=this.game.state.avatar.spellbook; i++) {
                var spell = this.game.world.equipment.spells[i];
                var highlight = open;
                var suggest = false;
                if (spell.tile_from) {
                    var fwdTile = this.game.getTileInfoAvatarForward();
                    if (fwdTile && (spell.tile_from == fwdTile.tile_type)) {
                        highlight = true;
                    }
                }
                if ((i==1) && (avatar.hp < avatar.max_hp)) {
                    suggest = true;
                }
                this.mainContext.globalAlpha = highlight ? 1.0 : 0.5;
                if (highlight || battle || suggest) {
                    this.drawSheetIndex("spell", i, i-1);
                }
            }

            this.mainContext.globalAlpha = 1;
        }
    },
    getSheetByName : function(name) {
        var infoSheetIndex = this.world.rendering.sheets_by_name[name];
        var sprite = this.world.rendering.sheets[infoSheetIndex];
        console.assert(sprite);
        return sprite;
    },
    drawSheetIndex : function(sprite, index, xoffset_index=0) {
        if (typeof sprite == "string") {
            sprite = this.getSheetByName(sprite);
        }
        var img = this.images.sheets[sprite.index].tryGetImg();
        if (!img) return;

        var x = sprite.start_x + (index * sprite.width);
        var y = sprite.start_y;
        var dst_x = sprite.draw_x + (xoffset_index * sprite.width);
        this.mainContext.drawImage(img, 
            x, y, sprite.width, sprite.height,
            dst_x, sprite.draw_y, sprite.width, sprite.height);
    },
    udpateStatus : function() {
        var status = this.game.latest_status;
        if (status == "" && this.game.state.menu_open) {
            var msg = this.world.maps[this.game.state.avatar.map_id].name;
            msg += "\nfacing " + this.game.state.avatar.facing;
            status = msg;
        }
        this.drawStringAligned(status, -1, -1);

        var msg = status;
        //this.mainStatus.innerText = msg;
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
    measureStringLines : function(str) {
        if (!str.includes("\n")) return 1;
        return str.split("\n").length;
    },
    drawStringAligned : function(str,alignX=0,alignY=0) {
        var font = this.world.font;
        var lines = this.measureStringLines(str);
        var h = font.height * lines;
        var sh = this.world.rendering.screen.height - 2;
        var sw = this.world.rendering.screen.width - 3;

        var y = 0;
        if (alignY == 0) y = (sh/2) - (h/2);
        if (alignY > 0) y = sh - h;
        y = Math.floor(y);

        var w = this.measureStringWidth(str);
        var x = 0;
        if (alignX == 0) x = (sw / 2) - (w/2);
        if (alignX > 0) x = sw - w;
        x = Math.floor(x);

        if (lines == 1) {
            this.drawStringAtXY(str, 1+x, 1+y);
        } else {
            var parts = str.split("\n");
            for (var pi in parts) {
                var ln = parts[pi];
                this.drawStringAtXY(ln, 1+x, 1+y);
                y += font.height;
            }
        }
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
        var max_w = 0;
        for (var i=0; i<str.length; i++) {
            if (str.charAt(i)=='\n') {
                w = 0;
                continue;
            }
            w += this.glyphWidth(str.charAt(i)) + this.world.font.kerning;
            max_w = Math.max(max_w, w);
        }
        return max_w;
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


