
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
};

var dawnUtils = new Object(dawnUtils_prototype);

