
var dawnSwipe_prototype = {
    game : null,
    mainElement : null,
    statusElement : null,
    isDown : false,
    setupSwipes : function(game,viewEl,statusEl) {
        this.game = game;
        this.mainElement = viewEl;
        this.statusElement = statusEl;
        var _this = this;

        this.mainElement.addEventListener('mousedown',(e) => {
            _this.doSwipe(e.offsetX, e.offsetY, true, false);
        });
        this.mainElement.addEventListener('mousemove',(e) => {
            _this.doSwipe(e.offsetX, e.offsetY, _this.isDown, true);
        });
        this.mainElement.addEventListener('mouseup',(e) => {
            _this.doSwipe(e.offsetX, e.offsetY, false, false);
        });
    },
    doSwipe : function(x,y,isDown,isMove) {
        this.isDown = isDown;
        var scl = this.mainElement.width / this.mainElement.clientWidth;
        x *= scl;
        y *= scl;
        var msg = "" + x + "," + y + " " + isDown + " " + isMove;
        this.statusElement.innerText = msg;
    },
};

var dawnSwipe = new Object(dawnSwipe_prototype);