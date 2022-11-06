

var FolderUtils = {

    PathParentFolder : function(path) {
        if (path.endsWith("/")) {
            path = path.substring(0,path.length-1);
            var ending = path.lastIndexOf("/");
            if (ending > 0) {
                path = path.substring(0,ending+1);
                return path;
            }
        }
        if (path.includes("/")) {
            var ending = path.lastIndexOf("/");
            return path.substring(0,ending+1);
        }
        console.error("TODO");
        return path;
    },

    PathWithoutFolder : function(path) {
        if (path.includes("/")) {
            var ending = path.lastIndexOf("/");
            return path.substring(ending+1);
        }
        return path;
    },

    PathDisplayName : function(path) {
        path = FolderUtils.PathWithoutFolder(path);
        if (path.includes(".")) {
            path = path.substring(0,path.lastIndexOf("."));
        }
        return path;
    },



};

var ImportUtils = {

    ImportByPath: function(path, callback) {
        var lpath = path.toLowerCase();
        if (lpath.endsWith(".obj")) {
            return this.ImportByPath_OBJ(path, callback);
        }
        if (lpath.endsWith(".json")) {
            return this.ImportByPath_JSON(path, callback);
        }
        alert("TODO");
    },

    ImportJsonTransform : function(el,jsonObj) {
        if (jsonObj.position) {
            var p = jsonObj.position;
            el.position.set(p[0],p[1],p[2]);
        }
        if (jsonObj.rotation) {
            var p = jsonObj.rotation;
            el.rotation.set(p[0],p[1],p[2]);
        }
        if (jsonObj.scale) {
            var p = jsonObj.scale;
            el.scale.set(p[0],p[1],p[2]);
        }
        if (jsonObj.rotation_degrees) {
            var p = jsonObj.rotation_degrees;
            var s = 3.14159 / 180.0;
            el.rotation.set(p[0]*s,p[1]*s,p[2]*s);
        }
    },

    ImportJsonRecursive : function(jsonObj,folderPath) {
        var el = new THREE.Group();
        //el.userData = ImportUtils.lewcidObject_CleanUserData( jsonObj );
        if (jsonObj.name) {
            el.name = jsonObj.name;
        }
        ImportUtils.ImportJsonTransform(el, jsonObj);
        if (jsonObj.source) {
            var url = folderPath + jsonObj.source;
            if (jsonObj.source.startsWith(".json")) {
                ImportUtils.ImportByPath_JSON(jsonObj.source, (obj)=>{
                    el.add(obj);
                });
            } else {
                AssetCache.CloneByPath(url, (obj)=>{}, el);
            }
        }
        if (jsonObj.children) {
            for (var childIndex in jsonObj.children) {
                var child = jsonObj.children[childIndex];
                var res = ImportUtils.ImportJsonRecursive(child,folderPath);
                if (!res.name) {
                    res.name = "child" + childIndex;
                }
                el.add(res);
            }
        }
        return el;
    },

    ImportByPath_JSON: function(path, callback) {
        dawnUtils.downloadJson(path, (rawObj) => {
            var folder = FolderUtils.PathParentFolder(path);
            var el = ImportUtils.ImportJsonRecursive(rawObj, folder);
            callback(el);
        });
    },

    ImportByPath_OBJ: function(path, callback) {
        var onProgress = (() => {});
        var mtlPath = path.replace(".obj",".mtl");
        var loadObjWithMaterials = ((materials) => {
            if (materials) this.mObjLoader.setMaterials(materials);
            this.mObjLoader.load( path, function ( object ) {
                callback(object);
            }, onProgress );
        });
        this.mMtlLoader.load( mtlPath, (materials)=>{
            materials.preload();
            loadObjWithMaterials(materials);
        }, (progress) => {}, (errorInfo) => {
            loadObjWithMaterials(null);
        });

    },

    ExportSceneAsJson : function(el) {
        var ans = {
        };
        if (el.name) {
            ans.name = el.name;
        }
        if (el.children && el.children.length!=0) {
            ans.children = [];
            for (var ci in el.children) {
                var child = el.children[ci];
                ans.children.push(ImportUtils.ExportSceneAsJson(child));
            }
        }
        return ans;
    },


    mObjLoader: new THREE.OBJLoader(),
    mMtlLoader: new THREE.MTLLoader(),

    setup: function() {
        //this.mObjLoader.setPath('models/src/obj/');
    }
};
ImportUtils.setup();

var AssetCache = {

    mKnownAssetsByPath: { },
    mCleanRoot: new THREE.Group(),

    CloneByPath: function(path, callback, parent) {
        var cache = this.EnsureCacher(path);
        var onReady = ((originalObj) => {
            var obj = this.CustomClone(originalObj);
            if (parent) {
                parent.add(obj);
            }
            if (callback) {
                callback(obj);
            }
            return obj;
        });
        if (cache.ready) {
            onReady(cache.cleanCopy);
            return;
        }
        cache.readyCallbacks.push(onReady);
        if (!(cache.downloading)) {
            cache.downloading = true;
            ImportUtils.ImportByPath(path, (obj)=>{
                cache.cleanCopy = obj;
                cache.downloading = false;
                cache.ready = true;
                for (var i in cache.readyCallbacks) {
                    var cb = cache.readyCallbacks[i];
                    if (cb) {
                        cb(obj);
                    }
                }
            }, AssetCache.mCleanRoot, /*skipCache=*/true);
        }
    },

    CustomClone : function(obj) {
        if (!obj) return obj;
        if ("clone" in obj) {
            return obj.clone();
        }
        var derived = new Object(obj);
        return derived;
    },

    EnsureCacher: function(path) {
        if (path in this.mKnownAssetsByPath) {
            return this.mKnownAssetsByPath[path];
        }
        var cacher = {
            path : path,
            ready : false,
            downloading : false,
            cleanCopy : null,
            readyCallbacks : [],
            clone : function() {
                console.assert(this.cleanCopy);
                return this.cleanCopy.clone();
            },
        };
        this.mKnownAssetsByPath[path] = cacher;
        return cacher;
    },

};

var gameRenderThree_prototype = {
    canvas : null,
    renderer : null,
    scene_root : null,
    camera : null,
    unit_mesh : null,
    obj_loader : null,
    game : null,
    world : null,

    initFromGameWorld : function(game, world, canvas, status) {
        if (!this.game) {
            this.game = game;
            this.world = world;
        }

        // only init THREE once:
        if (this.canvas) return;

        console.assert(THREE);
        const _this = this;

        const camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera = camera;
        camera.position.z = 1;
        camera.position.y = 0.5;

        const scene = new THREE.Scene();
        this.scene_root = scene;

        const light = new THREE.DirectionalLight( 0x707070, 1 );
        light.position.set( 1, 1, 1 ).normalize();
        scene.add( light );

        const amlight = new THREE.AmbientLight( 0x707070 ); // soft white light
        scene.add( amlight );

        //const texture = new THREE.TextureLoader().load( 'textures/crate.gif' );

        if (true) { // unit geo
            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            const material = new THREE.MeshLambertMaterial( { color: 0xccff44 } ); //new THREE.MeshBasicMaterial( );//{ map: texture } );

            mesh = new THREE.Mesh( geometry, material );
            mesh.position.set(0,-0.5,0);
            scene.add( mesh );

            mesh = new THREE.Mesh( geometry, material );
            this.unit_mesh = mesh;
            mesh.position.set(0,-0.5,0);
            scene.add( mesh );
        }

        this.game.callOnChanged.push( (() => { _this.redraw(); }) );

        this.canvas = canvas;
        var renderer = new THREE.WebGLRenderer( { antialias:false, canvas:canvas } );
        this.renderer = renderer;
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( 640, 480 ); 


        const onProgress = function ( xhr ) {
            _this._xhrProgress(xhr);
        };
        var testPath = "models/part_floor.json";
        AssetCache.CloneByPath(testPath, (obj)=>{
            console.log("Loaded " + testPath);
        }, scene);

        this.obj_loader = new THREE.OBJLoader();
        this.obj_loader.setPath('models/src/obj/');
                    //.setMaterials( materials )
        this.obj_loader.load( 'banner.obj', function ( object ) {

                        //object.position.y = -0.5;
                        scene.add( object );
                        _this.redraw();

                    }, onProgress );

        //this.setupSubscriptions(gameCore);
    },
    setupSubscriptions : function(game) {
        var systemRoot = null;
    },
    _xhrProgress : function(xhr) {
        if ( xhr.lengthComputable ) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
        }
    },
    debugNow: function() {
        var scene = this.scene_root;
        var obj = ImportUtils.ExportSceneAsJson(scene);
        var txt = JSON.stringify(obj);
        alert(txt);
    },
    redraw : function() {
        if (!this.game) return;

        if (this.unit_mesh) {
            this.unit_mesh.rotation.x += 0.5;
            this.unit_mesh.rotation.y += 0.1;
        }

        if (this.renderer && this.scene_root && this.camera) {
            this.renderer.render( this.scene_root, this.camera );
        }
    }
};


var gameRenderThree = new Object(gameRenderThree_prototype);

