

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
            if (url.endsWith(".json")) {
                ImportUtils.ImportByPath_JSON(url, (obj)=>{
                    el.add(obj);
                });
            } else {
                AssetCache.CloneByPath(url, (obj)=>{
                    el.add(obj);
                });
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

    ImportByPath_MTL: function(path, callback) {
        var mMtlLoader = new THREE.MTLLoader();
        mMtlLoader.load(path, (materials)=>{
            callback(materials);
        });
    },

    ImportByPath_OBJ: function(path, callback) {

        var mObjLoader = new THREE.OBJLoader();
        var mMtlLoader = new THREE.MTLLoader();
        var onProgress = (() => {});
        var mtlPath = path.replace(".obj",".mtl");
        var loadObjWithMaterials = ((materials) => {
            if (materials) mObjLoader.setMaterials(materials);
            mObjLoader.load( path, function ( object ) {
                callback(object);
            }, onProgress );
        });
        
        var useSeperateMaterials = false;
        if (useSeperateMaterials) {
            console.log("MtlPath = " + mtlPath);
            mMtlLoader.load( mtlPath, (materials)=>{
                materials.preload();
                loadObjWithMaterials(materials);
            }, (progress) => {}, (errorInfo) => {
                loadObjWithMaterials(null);
            });
        } else {
            var commonMtlPath = FolderUtils.PathParentFolder(path) + "common.mtl";
            console.log("MtlPath = " + commonMtlPath);
            AssetCache.CloneByPath(commonMtlPath, (materials)=>{
                loadObjWithMaterials(materials);
            }, null, {dont_clone:true,importer:(path,callback)=>{
                ImportUtils.ImportByPath_MTL(path,callback);
            }} );
        }

    },

    ExportSceneAsJson : function(el) {
        var ans = {
        };
        if (el.name) {
            ans.name = el.name;
        }
        if (el.type) {
            ans.type = el.type;
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



    setup: function() {
        //this.mObjLoader.setPath('models/src/obj/');
    }
};
ImportUtils.setup();

var AssetCache = {

    mKnownAssetsByPath: { },
    mCleanRoot: new THREE.Group(),

    CloneByPath: function(path, callback, parent, options) {
        var cache = this.EnsureCacher(path);
        var onReady = ((originalObj) => {
            var obj = originalObj;
            if ((!options) || (!options.no_clone)) {
                obj = this.CustomClone(originalObj);
            }
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
        var importer = ((path,cb)=>{
            ImportUtils.ImportByPath(path, cb);
        });
        if (options && options.importer) {
            importer = options.importer;
        }
        if (!(cache.downloading)) {
            cache.downloading = true;
            importer(path, (obj)=>{
                cache.cleanCopy = obj;
                cache.downloading = false;
                cache.ready = true;
                for (var i in cache.readyCallbacks) {
                    var cb = cache.readyCallbacks[i];
                    if (cb) {
                        cb(obj);
                    }
                }
            });
        }
    },

    CustomClone : function(obj) {
        if (!obj) return obj;
        if ("clone" in obj) {
            return obj.clone( /*recursive=*/true );
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

var degToRad = (3.14159 / 180.0);

var gameRenderThree_prototype = {
    canvas : null,
    renderer : null,
    scene_root : null,
    camera : null,
    light : null,
    unit_mesh : null,
    obj_loader : null,
    game : null,
    current_map : null,
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

        const camera = new THREE.PerspectiveCamera( 90, 640 / 480, 0.1, 100 );
        this.camera = camera;
        camera.position.z = 1;
        camera.position.y = 0.5;

        const scene = new THREE.Scene();
        this.scene_root = scene;

        const light = new THREE.PointLight( 0xFFffFF, 1, 8 );
        this.light = light;
        light.position.set( 1, 1, 1 ).normalize();
        scene.add( light );

        //const amlight = new THREE.AmbientLight( 0xFFffFF ); // soft white light
        //scene.add( amlight );

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
        /*
        var testPath = "models/map_0.json";
        ImportUtils.ImportByPath(testPath, (obj)=>{
            console.log("Loaded " + testPath);
            scene.add(obj);
        });
        */

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
    rotationForFacing : {
        "north":[ 0, 90*degToRad, 0 ],
        "west":[ 0, 180*degToRad, 0 ],
        "south":[ 0, 270*degToRad, 0 ],
        "east":[ 0, 0*degToRad, 0 ],
    },
    _tempOffset : new THREE.Vector3(),
    _tempForward : new THREE.Vector3(),
    _tempRotation : new THREE.Quaternion(),
    _tempEuler : new THREE.Euler(),
    _tempRotationVec : new THREE.Vector3(),
    updateAvatar : function(avatar) {
        
        var basicRot = this.rotationForFacing[avatar.facing];
        var rot = this._tempRotationVec;
        rot.set(basicRot[0], basicRot[1], basicRot[2]);
        var pos = this._tempOffset;
        pos.set(avatar.y*2, 1.0, -avatar.x*2);

        var euler = this._tempEuler;
        euler.set(rot.x, rot.y, rot.z);
        var fwd = this._tempForward;
        fwd.set(0,0,-1);
        fwd.applyEuler(euler);
        
        var preInput = this.game.state.input_preview;
        var prePct = this.game.state.input_percent;
        switch (preInput) {
            case "left":
            case "right":
                var dir = ((preInput == "right") ? -1 : 1);
                rot.y += prePct * (dir * 90.0 * degToRad);
                break;
            case "up":
            case "down":
                var dir = ((preInput == "up") ? 1 : -1);
                pos.addScaledVector(fwd, dir * prePct * 2.0);
                break;
            default:
                break;
        }
        this.camera.position.set(pos.x, pos.y, pos.z);
        this.camera.rotation.set(rot.x, rot.y, rot.z);
        this.light.position.copy(this.camera.position);
        
    },
    updateMap: function(map_id) {
        if (this.current_map && this.current_map.customData.map_id == map_id) {
            return;
        }
        if (this.current_map) {
            this.current_map.removeFromParent();
            this.current_map = null;
        }
        this.current_map = new THREE.Group();
        this.scene_root.add(this.current_map);
        this.current_map.customData = {
            map_id : map_id
        };
        var path = "models/map_" + map_id + ".json";
        ImportUtils.ImportByPath(path, (obj)=>{
            console.log("Loaded " + path);
            this.current_map.add(obj);
        });
    },
    redraw : function() {
        if (!this.game) return;

        var avatar = this.game.state.avatar;
        this.updateAvatar(avatar);
        this.updateMap(avatar.map_id);

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

