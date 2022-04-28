
var dawnUtils_prototype = {
    downloadJson : function(file, callback) {
        dawnUtils.downloadText(file, (txt) => {
            var obj = JSON.parse(txt);
            callback(obj);
        });
    },
    downloadText : function(file, callback) {
        var rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", file, true);
        rawFile.onreadystatechange = function() {
            if (rawFile.readyState === 4 && rawFile.status == "200") {
                callback(rawFile.responseText);
            }
        }
        rawFile.send(null);
    },
    _removeQuote : "<rmq>",
    customJsonStringify(obj) {
        var str = JSON.stringify(obj, dawnUtils.customJsonReplacer, 2);
        str = dawnUtils.replaceAll(str, "\"" + dawnUtils._removeQuote, "");
        str = dawnUtils.replaceAll(str, dawnUtils._removeQuote + "\"", "");
        return str;
    },
    customJsonReplacer : function(key,value) {
        if (Array.isArray(value)) {
            for (var i in value) {
                if (typeof(value[i])!="number") {
                    return value;
                }
            }
            var res = "";
            for (var i in value) {
                var str = "" + value[i];
                if (str.length < 2) {
                    str = " " + str;
                }
                if (i != 0) res += ",";
                res += str;
            }
            return dawnUtils._removeQuote + "[" + res + "]" + dawnUtils._removeQuote;
        }
        return value;
    },
    replaceAll : function (str, from, to) {
        while (str.includes(from)) {
            str = str.replace(from, to);
        }
        return str;
    },
    parsePath : function(root,path) {
        var parts = path.split(".");
        for (var i in parts) {
            var prop = parts[i];
            var index = null;
            if (prop.endsWith("]")) {
                var mid = prop.indexOf("[");
                index = prop.substring(mid+1).replace("]","");
                prop = prop.substring(0,mid);
            }
            console.assert(prop in root);
            root = root[prop];
            if (index != null) {
                root = root[index];
            }
        }
        return root;
    },
    cleanPathToName : function(path) {
        if (path.includes("/")) {
            path = path.substring(path.lastIndexOf("/")+1);
        }
        if (path.includes(".")) {
            path = path.substring(0,path.indexOf("."));
        }
        var ans = "";
        var parts = path.split("_");
        for (var i in parts) {
            var p = parts[i];
            p = p.substring(0,1).toUpperCase() + p.substring(1);
            if (i != 0) {
                ans += " ";
            }
            ans += p;
        }
        return ans;
    },
    cloneDeep : function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    cookieSave : function(game,prefix="dawn_state") {
        var txt = JSON.stringify(game.state);
        document.cookie = prefix + "=" + txt;
    },
    cookieTryLoad : function(game,prefix="dawn_state") {
        var parts = document.cookie.split(";");
        prefix = prefix + "=";
        for (var i in parts) {
            var p = parts[i].trim();
            if (p.startsWith(prefix)) {
                p = p.replace(prefix,"");
                var obj = JSON.parse(p);
                game.loadStateExternal(obj);
                return;
            }
        }
        return false;
    },
    cleanPathForId : function(path) {
        return path.replace(".","_").replace("[","_").replace("]","_");
    },
    lerp : function(a,b,t) {
        return ((b-a)*t) + a;
    },
    encode : function(v,a,b) {
        return (v - a) / (b - a);
    },
    decode : function(v,a,b) {
        return (a + (v*(b - a)));
    },
    encodeRect : function(v,r) {
        var x = this.encode(v.x, r.x, r.x+r.width);
        var y = this.encode(v.y, r.y, r.y+r.height);
        v.width = this.encode(v.x+v.width, r.x, r.x+r.width)-x;
        v.height = this.encode(v.y+v.height, r.y, r.y+r.height)-y;
        v.x = x;
        v.y = y;
    },
    decodeRect : function(v,r) {
        var x = this.decode(v.x, r.x, r.x+r.width);
        var y = this.decode(v.y, r.y, r.y+r.height);
        v.width = this.decode(v.x+v.width, r.x, r.x+r.width)-x;
        v.height = this.decode(v.y+v.height, r.y, r.y+r.height)-y;
        v.x = x;
        v.y = y;
    },
    lerpRect : function(d,from,to,t) {
        d.x = this.lerp(from.x, to.x, t);
        d.y = this.lerp(from.y, to.y, t);
        d.width = this.lerp(from.width, to.width, t);
        d.height = this.lerp(from.height, to.height, t);
    },
};

var dawnUtils = new Object(dawnUtils_prototype);

