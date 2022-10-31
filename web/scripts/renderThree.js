
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

        this.canvas = canvas;
        var renderer = new THREE.WebGLRenderer( { antialias:false, canvas:canvas } );
        this.renderer = renderer;
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( 640, 480 ); 


        const onProgress = function ( xhr ) {
            _this._xhrProgress(xhr);
        };
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

