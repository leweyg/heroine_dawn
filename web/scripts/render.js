

// Renderer:
var renderer = new Object();

function vis_cell(dx, dy, ind) {
    return {
        dx:dx, dy:dy, index:ind,
    };
}
/*
Drawing is done in this order (a=10, b=11, c=12)
.........
..02431..
..57986..
...acb...
.........
*/ 
renderer.visible_cells_north = [
    vis_cell(0-2,0-2,0),
    vis_cell(0+2,0-2,1),
    vis_cell(0-1,0-2,2),
    vis_cell(0+1,0-2,3),
    vis_cell(0,  0-2,4),
    vis_cell(0-2,0-1,5),
    vis_cell(0+2,0-1,6),
    vis_cell(0-1,0-1,7),
    vis_cell(0+1,0-1,8),
    vis_cell(0,  0-1,9),
    vis_cell(0-1,0, 10),
    vis_cell(0+1,0, 11),
    vis_cell(0,  0, 12),
];

renderer.transform_by_direction = {
    north : { x:"+x", y:"+y" },
    east :  { x:"+y", y:"+y" },
    south : { x:"-x", y:"-y" },
    west :  { x:"-y", y:"-x" },
};

// Each tile has the same layout on the sprite sheet
// tiles 0-12 also represent position 0-12
renderer.tile_parts_by_visible_cell = [
    {"width": 80,  "height": 120, "src_x": 0,   "src_y": 0, "dest_x": 0,  "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 80,  "src_y": 0, "dest_x": 80, "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 160, "src_y": 0, "dest_x": 0,  "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 240, "src_y": 0, "dest_x": 80, "dest_y": 0},  
    {"width": 160, "height": 120, "src_x": 320, "src_y": 0, "dest_x": 0,  "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 480, "src_y": 0, "dest_x": 0,  "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 560, "src_y": 0, "dest_x": 80, "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 0,   "src_y": 120, "dest_x": 0,  "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 80,  "src_y": 120, "dest_x": 80, "dest_y": 0},
    {"width": 160, "height": 120, "src_x": 160, "src_y": 120, "dest_x": 0,  "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 320, "src_y": 120, "dest_x": 0,  "dest_y": 0},
    {"width": 80,  "height": 120, "src_x": 400, "src_y": 120, "dest_x": 80, "dest_y": 0},
    {"width": 160, "height": 120, "src_x": 480, "src_y": 120, "dest_x": 0,  "dest_y": 0}
  ];


