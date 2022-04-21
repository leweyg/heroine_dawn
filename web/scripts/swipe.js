
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
        this.mainElement.addEventListener('touchstart', (e) => {
            this.innerTouch(e, true, false);
        }, false);
        this.mainElement.addEventListener('touchmove', (e) => {
            this.innerTouch(e, true, true);
        }, false);
        this.mainElement.addEventListener('touchcancel', (e) => {
            this.innerTouch(e, false, false);
        }, false);
        this.mainElement.addEventListener('touchend', (e) => {
            this.innerTouch(e, false, false);
        }, false);
    },
    innerTouch : function(e,isDown,isMove) {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length >= 1) {
            var t = e.touches[0];
            this.innerInput(e,t.clientX,t.clientY,isDown,isMove);
        } else {
            var scl = this.inputScale();
            this.innerInput(e,this.last_x/scl,this.last_y/scl,isDown,isMove);
        }
    },
    inputScale : function() {
        var scl = this.mainElement.width / this.mainElement.clientWidth;
        return scl;
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
        if ((this.isDown) && (!isDown)) {
            // end touch:
            if (this.dragDistance() > 5) {
                var dir = this.dragAngle();
                this.game.doInput(dir);
            } else {
                this.game.doInput('center');
            }
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
    dragAngle : function() {
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