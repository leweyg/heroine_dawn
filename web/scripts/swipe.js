
var dawnSwipe_prototype = {
    game : null,
    mainElement : null,
    statusElement : null,
    isDown : false,
    start_x : 0,
    start_y : 0,
    last_x : 0,
    last_y : 0,
    setupSwipes : function(game,viewEl,statusEl) {
        this.game = game;
        this.mainElement = viewEl;
        this.statusElement = statusEl;
        var _this = this;

        // mouse:
        this.mainElement.addEventListener('mousedown',(e) => {
            _this.innerInput(e, e.offsetX, e.offsetY, true, false);
        });
        this.mainElement.addEventListener('mousemove',(e) => {
            _this.innerInput(e, e.offsetX, e.offsetY, _this.isDown, true);
        });
        this.mainElement.addEventListener('mouseup',(e) => {
            _this.innerInput(e, e.offsetX, e.offsetY, false, false);
        });
        this.mainElement.addEventListener('dblclick',(e) => {
            _this.innerInput(e, e.offsetX, e.offsetY, false, false);
        });
        // touch:
        this.mainElement.addEventListener('touchstart', (e) => {
            _this.innerTouch(e, true, false);
        }, false);
        this.mainElement.addEventListener('touchmove', (e) => {
            _this.innerTouch(e, true, true);
        }, false);
        this.mainElement.addEventListener('touchcancel', (e) => {
            _this.innerTouch(e, false, false);
        }, false);
        this.mainElement.addEventListener('touchend', (e) => {
            _this.innerTouch(e, false, false);
        }, false);
        // keyboard:
        document.addEventListener('keydown', (e) => {
            _this.innerKeyChange(e,true);
        });
        document.addEventListener('keyup', (e) => {
            _this.innerKeyChange(e,false);
        });
    },
    innerTouch : function(e,isDown,isMove) {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length >= 1) {
            var t = e.touches[0];
            var el = this.mainElement.getBoundingClientRect();
            this.innerInput(e,t.clientX-el.left,t.clientY-el.top,isDown,isMove);
        } else {
            var scl = this.inputScale();
            this.innerInput(e,this.last_x/scl,this.last_y/scl,isDown,isMove);
        }
    },
    inputScale : function() {
        var scl = this.mainElement.width / this.mainElement.clientWidth;
        return scl;
    },
    _dirFromKeyboard : {
        "ArrowRight" : "right",
        "ArrowLeft" : "left",
        "ArrowUp" : "up",
        "ArrowDown" : "down",
        " " : "center",
        "Enter" : "center",
        "Shift" : "menu",
        "Escape" : "avoid",
        "1" : "cast[1]",
        "2" : "cast[2]",
        "3" : "cast[3]",
        "4" : "cast[4]",
        "5" : "cast[5]",
    },
    innerKeyChange : function(e,isDown) {
        e.preventDefault();
        e.stopPropagation();
        const key = e.key;
        if (key in this._dirFromKeyboard) {
            var dir = this._dirFromKeyboard[key];
            if ((key == "Escape") && (!this.game.isBattle())) {
                dir = "menu";
            }
            var isPreview = isDown;
            this.game.doInput(dir,isPreview);
        }
    },
    innerForButtons : function(dir,isPreview=false,previewPercent=0.0) {
        if (dir == "center") {
            // check for clicks:
            if (this.checkMenuClick("info_icon")) {
                dir = "menu";
            } else if (this.checkMenuClick("attack_icon")) {
                dir = "center"; // for now
            } else if (this.checkMenuClick("retreat_icon")) {
                dir = "avoid";
            } else {
                var ndx = this.checkMenuClick("spell", this.game.state.avatar.spellbook);
                if (ndx) {
                    dir = "cast[" + ndx + "]";
                }
            }
        }
        this.game.doInput(dir,isPreview,previewPercent);
    },
    checkMenuClick : function(name, icon_count) {
        var sheets = this.game.world.rendering.sheets;
        for (var si in sheets) {
            var sheet = sheets[si];
            if (sheet.name == name) {
                var x = this.start_x - sheet.draw_x;
                var y = this.start_y - sheet.draw_y;
                if ((x < 0) || (y < 0) || (y > sheet.height)) {
                    return false;
                }
                if (icon_count) {
                    if (x < (icon_count * sheet.width)) {
                        return Math.floor(x / sheet.width)+1;
                    }
                    return false;
                } else if (x <= sheet.width) {
                    return true;
                }
                return false;
            }
        }
        console.error("Unknown sheet " + name);
    },
    innerInput : function(e,x,y,isDown,isMove) {
        e.preventDefault();
        e.stopPropagation();
        var scl = this.inputScale();
        x *= scl;
        y *= scl;
        this.last_x = x;
        this.last_y = y;
        if ((!this.isDown) && (isDown)) {
            this.isDown = isDown;
            this.start_x = x;
            this.start_y = y;
        }
        else if ((this.isDown) && (!isDown)) {
            // end touch:
            this.innerForButtons(this.dragAngle());
        }
        else if ((this.isDown) && (isDown) && isMove) {
            this.innerForButtons(this.dragAngle(), true, this.dragPercent());
        }
        this.isDown = isDown;

        var msg = "" + x + "," + y + " " + isDown + " " + isMove;
        this.statusElement.innerText = msg;
    },
    dragDistance : function() {
        var dx = (this.last_x - this.start_x);
        var dy = (this.last_y - this.start_y);
        return Math.sqrt((dx*dx)+(dy*dy));
    },
    _minDragDist : 5,
    _maxDragDist : 40,
    dragPercent : function() {
        var d = this.dragDistance();
        if (d < this._minDragDist) {
            return 0.0;
        }
        if (d > this._maxDragDist) {
            return 1.0;
        }
        var s = (d - this._minDragDist) / (this._maxDragDist - this._minDragDist);
        return s;
    },
    dragAngle : function() {
        if (this.dragDistance() <= 5) {
            return "center";
        }
        var types = this.game.world.rendering.screen_directions;
        var bestDir = "center";
        var bestScore = 0;
        var dx = (this.last_x - this.start_x);
        var dy = (this.last_y - this.start_y);
        for (var dir in types) {
            var a = types[dir];
            var scl = Math.sqrt((a.x*a.x)+(a.y*a.y));
            var score = ((a.x * dx) + (a.y * dy)) / scl;
            if (score > bestScore) {
                bestScore = score;
                bestDir = dir;
            }
        }
        return bestDir;
    },
};

var dawnSwipe = new Object(dawnSwipe_prototype);