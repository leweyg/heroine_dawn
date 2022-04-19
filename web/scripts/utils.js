
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
};

var dawnUtils = new Object(dawnUtils_prototype);

