

var dawnRenderer_prototype = {
    world : null,
    game : null,
    mainCanvas : null,
    mainContext : null,
    mainStatus : null,
    timeIndex : 0,
    isScene3D : false,
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
        setInterval(()=>{_this.onTimeTick();}, this.world.combat.time_unit_ms);

        this.images.font = {
            white:this.createImageLoader(world.font.src),
        };
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

        this.initRenderCells();
        
        this.game.callOnChanged.push( (() => { _this.redraw(); }) );
    },
    rect_ref_x_from_dyz : function(dy,dx) {
        var center = this.game.world.rendering.screen.center;
        var d = this.game.world.rendering.screen.diameters[Math.max(0,2-dy)];
        var nhd = -(d/2);
        var x = (nhd + d*dx + center.x);
        return x;
    },
    initRenderCells : function() {
        var renderRingsYX = [];
        var renderRingsOrdered = [];
        var renderRingsPacked = [];
        this.world.rendering.rings_yx = renderRingsYX;
        this.world.rendering.rings_ordered = renderRingsOrdered;
        this.world.rendering.rings_packed = renderRingsPacked;
        var renderRingCount = 3;
        var renderRingWidth = 7;
        var renderRingCenter = 3;
        var cellsNorth = this.world.rendering.visible_cells_north;
        var rectData = this.world.rendering.tile_parts_by_visible_cell;
        var center = this.game.world.rendering.screen.center;
        for (var y=0; y<renderRingWidth; y++) {
            renderRingsYX.push([]);
            for (var x=0; x<renderRingWidth; x++) {
                var cell = {
                    dx : x-renderRingCenter,
                    dy : y-renderRingCenter,
                    packed_index : (x+(y*renderRingWidth)),
                    dirs : {},
                    next_by_turn : {},
                    r : 0,
                    src_index : null,
                    rect_src : null,
                    rect_dst : null,
                    rect_ref : null,
                    is_center_back : false,
                };
                renderRingsPacked.push(cell);
                renderRingsYX[y].push(cell);
                renderRingsOrdered.push(cell);
                cell.is_center_back = ((cell.dx==0) && (cell.dy==1));
                cell.r = Math.max(Math.abs(cell.dx),Math.abs(cell.dy));
                var d = this.game.world.rendering.screen.diameters[Math.max(0,2-cell.dy)];
                var nhd = -(d/2);
                cell.rect_ref = {x:this.rect_ref_x_from_dyz(cell.dy,cell.dx),y:(nhd + center.y),width:d,height:d};
                if (cell.dx < 0) { // tile is on left, use right most edge
                    var bx = cell.rect_ref.x;
                    var ex = this.rect_ref_x_from_dyz(cell.dy-1,cell.dx+1);
                    cell.rect_ref.x = bx;
                    cell.rect_ref.width = ex-bx;
                } else if (cell.dx > 0) { // tile is on right, use left most edge
                    var bx = this.rect_ref_x_from_dyz(cell.dy-1,cell.dx);
                    var ex = cell.rect_ref.x + cell.rect_ref.width;
                    cell.rect_ref.x = bx;
                    cell.rect_ref.width = ex-bx;
                }

                for (var i in cellsNorth) {
                    var nc = cellsNorth[i];
                    if ((nc.dx == cell.dx) && (nc.dy == cell.dy)) {
                        cell.src_index = 1*i;
                        var cellRect = rectData[i];
                        cell.rect_src = {
                            x:cellRect.src_x, y:cellRect.src_y,
                            width:cellRect.width, height:cellRect.height
                        };
                        cell.rect_dst = {
                            x:cellRect.dest_x, y:cellRect.dest_y,
                            width:cellRect.width, height:cellRect.height
                        };
                        break;
                    }
                }
            }
        }
        renderRingsOrdered.sort((a,b) => {
            if (a.r != b.r) return (b.r - a.r);
            if (a.dy != b.dy) return (a.dy - b.dy);
            return (Math.abs(b.dx) - Math.abs(a.dx));
        });
        for (var k in renderRingsOrdered) {
            renderRingsOrdered[k].render_index = 1*k;
        }
        //console.log(JSON.stringify(renderRingsOrdered,null,2));
    },
    preloadContent : function() {
        for (var i in this.images) {
            var group = this.images[i];
            for (var j in group) {
                group[j].tryGetImg();
            }
        }
    },
    redraw : function() {
        if (!this.game) return;

        this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

        if (!this.isScene3D) {
            this.drawScene();
        }
        //gameRenderThree.render();
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
        var cells = this.world.rendering.rings_ordered;

        // camera shake:
        var shake_y = 0;
        var shake_x = 0;
        var encounter = this.game.state.encounter;
        if (encounter && (encounter.type == "enemy")) {
            if (encounter.phase == 2) { // got hit:
                var enem = this.game.getRef(encounter.ref);
                var anim = enem.anim[encounter.phase];
                var dir = this.world.rendering.screen_directions[anim];
                var scl = 1;
                shake_y = dir.y * scl;
                shake_x = dir.x * scl;
            }
        }

        // perspective camera offset:
        var px = 0, py = 0;
        var preInput = this.game.state.input_preview;
        var isPreviewDown = (preInput == "down");
        var previewFwd = ((preInput == "up") || isPreviewDown);
        if (previewFwd) {
            if (isPreviewDown) {
                this.game.rotateAvatar(2);
            }
            var fwd = this.game.getTileInfoAvatarForward();
            if (fwd) {
                var walkable = this.world.tile_types[fwd.tile_type].walkable;
                if (!walkable) {
                    previewFwd = false;
                } else {
                    var thing = this.game.findThingForwardOfAvatar();
                    if (thing && ((thing.type == "exit") || (thing.type == "person"))) {
                        previewFwd = false;
                    }
                }
            } else {
                previewFwd = false;
            }
            if (isPreviewDown) {
                this.game.rotateAvatar(2);
            }
        }
        if ((preInput == "left")||(preInput == "right")) {
            previewFwd = true;
        }
        if (this.game.isBattle()) {
            previewFwd = false;
        }
        const usePixelPerspective = !previewFwd;
        if (usePixelPerspective && this.game.state.input_preview) {
            var dirName = this.game.state.input_preview;
            if (dirName in this.world.rendering.screen_directions) {
                var dir = this.world.rendering.screen_directions[dirName];
                px = dir.x;
                py = dir.y;
            }
        }
        
        for (var ci in cells) {
            var cell = cells[ci];
            var tile = this.getTileInfoForCell(cell);
            if (tile === undefined) continue;

            var tileImg = this.images.tiles[tile.tile_type].tryGetImg();
            if (!tileImg) continue;

            var pz = (3 - Math.abs(cell.dy))*1;
            var ppx = pz * -px;
            var ppy = pz * -py;

            if (!usePixelPerspective) {
                this.drawPartWithPerspective(tileImg, cell);
                continue;
            }
            if (!cell.rect_src) continue;

            var part = cell;
            this.mainContext.drawImage(tileImg, 
                cell.rect_src.x,  cell.rect_src.y,  cell.rect_src.width, cell.rect_src.height,
                cell.rect_dst.x + shake_x + ppx, cell.rect_dst.y + shake_y + ppy, 
                cell.rect_dst.width, cell.rect_dst.height);
        }

        if (!usePixelPerspective) {
            this.drawScenePerspective();
        }
    },
    _destRect : { x:0, y:0, width:0, height:0 },
    copyRectToFrom : function(to,from) {
        for (var i in from) {
            to[i] = from[i];
        }
    },
    cachedNextsById : {},
    ringCellInDir : function(cell_from,dir) {
        if (dir in cell_from.next_by_turn) {
            var ndx = cell_from.next_by_turn[dir];
            if (ndx >= 0) {
                return this.world.rendering.rings_packed[ndx];
            }
            return undefined;
        }
        var rings_yx = this.world.rendering.rings_yx;
        var c = Math.floor(rings_yx.length/2);
        var x = cell_from.dx + c;
        var y = cell_from.dy + c;
        var sx = x;
        var sy = y;
        var isTurn = false;
        if (dir == "up") {
            y += 1;
        } else if (dir == "down") {
            y -= 1;
        } else if (dir == "left") {
            isTurn = true;
            x = c - (sy - c);
            y = c + (sx - c);
        } else if (dir == "right") {
            isTurn = true;
            x = c + (sy - c);
            y = c - (sx - c);
        } else {
            throw "Unknown dir: " + dir;
        }
        if ((y>=0) && (x>=0) && (y < rings_yx.length) && (x < rings_yx[0].length)) {
            var res = rings_yx[y][x];
            if (isTurn && (res.is_center_back)) {
                res = rings_yx[y][x + res.dx + cell_from.dx];
            }
            cell_from.next_by_turn[dir] = res.packed_index;
            return res;
        }
        cell_from.next_by_turn[dir] = -1;
        return undefined;
    },
    _tempTransformRect : {x:0,y:0,width:0,height:0},
    rectTransformWith : function(rect,from,to,t) {
        var tmp = this._tempTransformRect;
        dawnUtils.encodeRect(rect,from);
        dawnUtils.lerpRect(tmp,from,to,t);
        dawnUtils.decodeRect(rect, tmp);

        /*
        rect.x += (to.x - from.x) * t;
        rect.y += (to.y - from.y) * t;
        rect.width *= dawnUtils.lerp(1,to.width/from.width,t);
        rect.height *= dawnUtils.lerp(1,to.height/from.height,t);
        */
    },
    drawPartWithPerspective : function(tileImg, cell) {
        var dst = this._destRect;
        
        this.copyRectToFrom(dst, cell.rect_dst);
        var fadeOut = 0;
        var nextCell = null;

        var perspectivePreview = true;
        if (perspectivePreview
            && (this.game.state.input_percent > 0))
        {
            var pct = this.game.state.input_percent;
            fadeOut = pct;

            var nextCell = this.ringCellInDir(cell, this.game.state.input_preview);
            if (nextCell) {
                this.rectTransformWith(dst, cell.rect_ref, nextCell.rect_ref, pct);
            }
        }

        if (cell && cell.rect_src) {
            this.mainContext.globalAlpha = Math.pow( 1.0 - fadeOut, 1 );
            this.drawImageFromRects(tileImg, 
                cell.rect_src, dst);
            this.mainContext.globalAlpha = 1;
        }

        if (nextCell && nextCell.rect_src) {
            this.copyRectToFrom(dst, nextCell.rect_dst);
            if (!cell.is_center_back) {
                this.rectTransformWith(dst, nextCell.rect_ref, cell.rect_ref, 1.0 - pct);
            }
            this.mainContext.globalAlpha = Math.pow( fadeOut, 1 );
            this.drawImageFromRects(tileImg, 
                nextCell.rect_src, dst);
            this.mainContext.globalAlpha = 1;
        }
    },
    drawImageFromRects : function(img, rect_src, rect_dst) {
        var center = {x:0,y:0};
        this.mainContext.drawImage(img, 
            rect_src.x,  rect_src.y,  rect_src.width, rect_src.height,
            rect_dst.x + center.x, rect_dst.y + center.y, 
            rect_dst.width, rect_dst.height);
    },
    drawScenePerspective : function() {
        var screen = this.game.world.rendering.screen;
        this.mainContext.fillStyle = "rgba(0, 0, 0, 0.25)";
        for (var y=0; y<=2; y++) {
            var cell = this.game.world.rendering.rings_yx[3-y][4];
            this.drawRectCentered(cell.rect_ref.x, cell.rect_ref.y, cell.rect_ref.width, cell.rect_ref.height);
        }
        for (var i in screen.diameters) {
            var d = screen.diameters[i];
            //this.drawRectCentered(d/2,(-d/2),d,d);
        }
    },
    drawRectCentered : function(x,y,width,height) {
        var center = this.game.world.rendering.screen.center;
        this.mainContext.fillRect(x+center.x, y+center.y, width, height);
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
    
            var msg = encounter.msg;
            if (msg.startsWith("Heroine")) {
                msg += "\n\n" + "battles are [ " + (this.game.state.battles_off ? "off" : "on") + " ]";
            }
            this.drawStringAligned(msg, -1, -1);
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
                var fadeInTime = 10;
                var fadeIn = Math.min(1, (encounter.total_time / fadeInTime));
                this.mainContext.globalAlpha *= fadeIn;
                var ndx = Math.floor(encounter.phase_time / this.world.combat.idle_anim_rate) % enem.anim.length;
                var scl = 2;
                if (encounter.phase != 0) {
                    ndx = encounter.phase;
                    scl = 20;
                }
                var offsetName = enem.anim[ndx];
                var offset = this.world.rendering.screen_directions[offsetName];
                var offset_x = offset.x;
                this.mainContext.drawImage(img, scl * offset_x, scl * offset.y);
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
            this.mainContext.globalAlpha = 0.6;
            this.drawSheetIndex("retreat_icon", 0);
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
            if (this.game.state.avatar.tamer) {
                msg += "\ntamer of all"
            }
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
        var fontImg = this.images.font.white.tryGetImg();
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

        var fontImg = this.images.font.white.tryGetImg();
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


