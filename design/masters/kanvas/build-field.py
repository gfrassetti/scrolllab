# Kanvas / VESPER: el escenario del hero, estilo ARC Raiders (2026-10-18). Reemplaza a la isla flotante.
# Un campo de pasto seco con un sendero, rocas y matas (geometría propia, color por vértice), y las piezas
# generadas (design/masters/kanvas/3d): la ruina y el auto (SAM 3D), la máquina gigante (Tripo), la torre
# (SAM 3D) y el cielo pintado como telón curvo. Sale como GLB con su cámara animada adentro: empieza en las
# caras de los dos personajes y se abre hasta ver el lugar entero. Los personajes NO van en el GLB (la web
# los carga aparte, con el aura); el script imprime el suelo donde pararlos.
#   blender -b --python build-field.py -- <salida.glb>
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, noise

OUT = sys.argv[sys.argv.index('--') + 1]
HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, '3d')
random.seed(11)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 0, 120
sc.render.fps = 24


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def color_verts(ob, fn):
    """Color por vértice (la web lo sombrea con luz suave, sin textura)."""
    me = ob.data
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            ca.data[li].color = (*fn(ob.matrix_world @ v, poly.normal), 1)


def plain_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.95
    return m


# --- el suelo: llano donde están los dos, un sendero que va hacia la torre, sube hacia el fondo ---------
GOLD = (0.80, 0.62, 0.30)
GOLD_D = (0.52, 0.40, 0.19)
DIRT = (0.50, 0.37, 0.26)
MOSS = (0.36, 0.40, 0.20)


def path_x(y):
    return math.sin(y * 0.08) * 1.2 + max(0.0, y - 6) * 0.22


def h(x, y):
    r = math.hypot(x, y)
    base = noise.noise(Vector((x * 0.06, y * 0.06, 0.3))) * 1.2 + noise.noise(Vector((x * 0.2, y * 0.2, 1.7))) * 0.18
    flat = min(1.0, r / 6)
    rise = max(0.0, y - 18) * 0.08
    rut = 0.08 * max(0.0, 1 - abs(x - path_x(y)) / 0.7)
    return base * flat + rise - rut


bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=150, y_segments=150, size=40)
for v in bm.verts:
    v.co.y += 22
    v.co.z = h(v.co.x, v.co.y)
me = bpy.data.meshes.new('ground')
bm.to_mesh(me)
bm.free()
ground = bpy.data.objects.new('ground', me)
sc.collection.objects.link(ground)
for p in me.polygons:
    p.use_smooth = True


def ground_col(p, n):
    t = (noise.noise(Vector((p.x * 0.15, p.y * 0.15, 4))) + 1) / 2
    c = mix(GOLD_D, GOLD, t)
    c = mix(c, MOSS, noise.noise(Vector((p.x * 0.08, p.y * 0.08, 9))) * 0.8)
    d = abs(p.x - path_x(p.y))
    return mix(DIRT, c, (d - 0.45) / 0.55)


# La textura dibujada del suelo (ground-ref.png, se repite cada GROUND_TILE) y el color por vértice
# encima, suave: solo da manchas y el sendero de tierra.
GROUND_TILE = 7.0
color_verts(ground, lambda p, n: mix((1.0, 1.0, 1.0), ground_col(p, n), 0.45))
uvl = ground.data.uv_layers.new(name='UVMap')
for poly in ground.data.polygons:
    for li in poly.loop_indices:
        co = ground.data.vertices[ground.data.loops[li].vertex_index].co
        uvl.data[li].uv = (co.x / GROUND_TILE, co.y / GROUND_TILE)
gm = plain_mat('field')
gimg = bpy.data.images.load(os.path.join(A, 'ground-ref.png'))
gimg.scale(1024, 1024)
gtx = gm.node_tree.nodes.new('ShaderNodeTexImage')
gtx.image = gimg
gm.node_tree.links.new(gtx.outputs['Color'], next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'])
ground.data.materials.append(gm)


def gz(x, y):
    return h(x, y)


# --- rocas y matas (icosferas deformadas) -------------------------------------------------------------
ROCK_T, ROCK_S = (0.62, 0.58, 0.50), (0.32, 0.30, 0.28)
BUSH_T, BUSH_S = (0.50, 0.52, 0.24), (0.22, 0.26, 0.12)


def blob(name, x, y, size, rough, top, side, squash):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1)
    seed = random.random() * 50
    for v in bm.verts:
        v.co *= 1 + noise.noise(v.co * 1.3 + Vector((seed, 0, 0))) * rough
        v.co.z *= squash
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    o.scale = (size, size * random.uniform(0.8, 1.2), size)
    o.rotation_euler.z = random.random() * 6.28
    o.location = (x, y, gz(x, y) + size * 0.12)
    bpy.context.view_layer.update()
    color_verts(o, lambda p, n: mix(side, top, n.z))
    for p in me.polygons:
        p.use_smooth = True
    o.data.materials.append(plain_mat(name))


# Sin rocas ni matas por ahora: hechas a mano se veían de baja calidad al lado de las piezas dibujadas
# (dueño, 2026-10-18). `blob` queda para cuando haya piezas generadas con el mismo dibujo.


# --- las piezas generadas -------------------------------------------------------------------------------
def place(path, name, height, x, y, rot_deg, sink=0.0, max_tris=None, tex=1024, keep_largest=False):
    """Importa un GLB, lo aligera, lo escala a `height` de alto y lo apoya en el suelo."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for o in [o for o in bpy.data.objects if o not in before and o.type != 'MESH']:
        bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if keep_largest:
        # SAM deja a veces pedazos sueltos flotando: queda la pieza más grande
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='LOOSE')
        bpy.ops.object.mode_set(mode='OBJECT')
        parts = [o for o in bpy.context.selected_objects]
        big = max(parts, key=lambda o: len(o.data.vertices))
        keep = [o for o in parts if o is big or len(o.data.vertices) >= len(big.data.vertices) * 0.15]
        for o in parts:
            if o not in keep:
                bpy.data.objects.remove(o)
        parts = keep
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:
            o.select_set(True)
        bpy.context.view_layer.objects.active = big
        if len(parts) > 1:
            bpy.ops.object.join()
        ob = big
        ob.name = ob.data.name = name
    # los GLB de SAM vienen sin soldar (cada triángulo con sus vértices): soldar antes de aligerar. Los
    # de Tripo ya vienen soldados y son enormes (1,4 M de triángulos): soldarlos tarda minutos.
    if len(ob.data.vertices) < 400000:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.0001)
        bpy.ops.object.mode_set(mode='OBJECT')
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if max_tris and tris > max_tris:
        m = ob.modifiers.new('dec', 'DECIMATE')
        m.ratio = max_tris / tris
        m.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier='dec')
    for mat in ob.data.materials:
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        for l in list(bsdf.inputs['Metallic'].links):
            nt.links.remove(l)
        bsdf.inputs['Metallic'].default_value = 0.0
        for n in nt.nodes:
            if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] > tex:
                n.image.scale(tex, tex)
    # escala por la altura y apoyo en el suelo, con el origen abajo al centro
    bb = [Vector(c) for c in ob.bound_box]
    lo = min(v.z for v in bb)
    hi = max(v.z for v in bb)
    cx = (min(v.x for v in bb) + max(v.x for v in bb)) / 2
    cy = (min(v.y for v in bb) + max(v.y for v in bb)) / 2
    ob.data.transform(__import__('mathutils').Matrix.Translation((-cx, -cy, -lo)))
    s = height / (hi - lo)
    ob.scale = (s, s, s)
    ob.rotation_euler.z = math.radians(rot_deg)
    ob.location = (x, y, gz(x, y) - sink)
    print(name, 'tris', sum(len(p.vertices) - 2 for p in ob.data.polygons))
    return ob


# alturas en unidades de la escena: los personajes miden 1.1 (≈ 1,75 m), así que 1 ≈ 1,6 m
place(os.path.join(A, 'ruin-sam.glb'), 'ruin', 5.2, -6.2, 9.0, 35, sink=0.15, max_tris=30000)
place(os.path.join(A, 'car-sam.glb'), 'car', 1.0, 3.6, 4.4, -125, sink=0.12, max_tris=14000)
place(os.path.join(A, 'tower-arc-sam.glb'), 'tower', 10.0, 5.2, 16.0, 0, sink=0.2, max_tris=40000, keep_largest=True)
place(os.path.join(A, 'machine-tripo.glb'), 'machine', 15.0, -9.0, 40.0, 25, sink=1.6, max_tris=50000)

# piedras, arbustos y cercas dibujados (SAM 3D): una malla por pieza y copias que la comparten (el GLB
# guarda la malla una sola vez). (x, y, alto, giro)
def scatter(proto, spots):
    s0 = proto.scale.x  # `place` lo dejó en 1 de alto: la escala de cada copia es s0 × su alto
    for i, (x, y, hh, rot) in enumerate(spots):
        o = proto if i == 0 else proto.copy()
        if i:
            sc.collection.objects.link(o)
            o.name = f'{proto.name}_{i}'
        o.scale = (s0 * hh,) * 3
        o.rotation_euler.z = math.radians(rot)
        o.location = (x, y, gz(x, y) - 0.05)


rock = place(os.path.join(A, 'rocks-sam.glb'), 'rocks', 1.0, 0, 0, 0, max_tris=12000)
scatter(rock, [(2.6, 2.2, 0.4, 20), (-3.0, 3.4, 0.55, 140), (5.6, 9.0, 1.0, 60), (-7.6, 3.6, 0.9, 200),
               (2.8, 7.2, 0.45, 310), (-3.4, 13.0, 1.3, 90), (8.6, 4.2, 0.8, 0)])
bush = place(os.path.join(A, 'bush-sam.glb'), 'bush', 1.0, 0, 0, 0, max_tris=12000)
scatter(bush, [(-2.0, 0.9, 0.7, 0), (2.6, 2.5, 0.8, 90), (-4.6, 6.4, 1.1, 30), (-8.2, 10.0, 1.3, 200), (4.4, 6.0, 0.8, 120),
               (6.4, 13.0, 1.4, 10), (1.5, 11.0, 0.9, 250), (-10.0, 15.0, 1.8, 70), (10.0, 8.0, 1.5, 300), (-1.3, 4.6, 0.6, 160)])
fence = place(os.path.join(A, 'fence-sam.glb'), 'fence', 1.0, 0, 0, 0, max_tris=10000)
scatter(fence, [(-1.7, 3.7, 1.0, 20), (3.9, 10.5, 1.1, -15)])

# --- el telón: el cielo pintado en un trozo de cilindro detrás (en la web va sin luz ni niebla) ----------
R, ARC, Y0 = 72.0, math.radians(150), 6.0
H = R * ARC / (3168 / 1344)
bm = bmesh.new()
uvl = bm.loops.layers.uv.new('UVMap')
segs = 48
cols = []
for i in range(segs + 1):
    a = -ARC / 2 + ARC * i / segs
    x, y = math.sin(a) * R, math.cos(a) * R + Y0
    cols.append((bm.verts.new((x, y, -4.0)), bm.verts.new((x, y, H - 4.0)), i / segs))
for i in range(segs):
    (a0, a1, u0), (b0, b1, u1) = cols[i], cols[i + 1]
    f = bm.faces.new((a0, b0, b1, a1))
    for l, uv in zip(f.loops, [(u0, 0), (u1, 0), (u1, 1), (u0, 1)]):
        l[uvl].uv = uv
me = bpy.data.meshes.new('backdrop')
bm.to_mesh(me)
bm.free()
back = bpy.data.objects.new('backdrop', me)
sc.collection.objects.link(back)
img = bpy.data.images.load(os.path.join(A, 'sky-ref.png'))
img.scale(2048, 869)
m = bpy.data.materials.new('backdrop')
m.use_nodes = True
nt = m.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
tx = nt.nodes.new('ShaderNodeTexImage')
tx.image = img
nt.links.new(tx.outputs['Color'], bsdf.inputs['Base Color'])
me.materials.append(m)

# --- la cámara: empieza en las caras y se abre hasta ver el lugar entero --------------------------------
print('suelo personajes', round(gz(0.35, 0.0), 3), round(gz(-0.95, 1.4), 3))
cam_data = bpy.data.cameras.new('CAMERA')
cam_data.lens = 40
cam_data.clip_end = 200
cam = bpy.data.objects.new('CAMERA', cam_data)
sc.collection.objects.link(cam)
target = bpy.data.objects.new('Camera_Target', None)
sc.collection.objects.link(target)
con = cam.constraints.new('TRACK_TO')
con.target = target
con.track_axis = 'TRACK_NEGATIVE_Z'
con.up_axis = 'UP_Y'
g0 = gz(0.35, 0.0)
# Dueño, 2026-10-18: el protagonista (con casco y el arma en la mano) en primer plano desde el arranque —de
# lejos y de arriba «no se aprecia nada»— y termina en su visor, que es lo que muestra la lámina del medio.
keys = [
    (0, (0.2, -2.25, g0 + 0.5), (0.05, 0.6, g0 + 0.92)),     # contrapicado: el protagonista en primer plano
    (40, (0.35, -1.75, g0 + 0.7), (0.15, 0.4, g0 + 0.95)),
    (80, (0.45, -1.3, g0 + 0.9), (0.3, 0.0, g0 + 0.96)),     # sube hacia el casco
    (120, (0.42, -0.95, g0 + 0.98), (0.33, 0.0, g0 + 0.95)), # el visor: lo que muestra la lámina del medio
]
for f, cp, tp in keys:
    cam.location = cp
    cam.keyframe_insert('location', frame=f)
    target.location = tp
    target.keyframe_insert('location', frame=f)
sc.camera = cam
bpy.context.view_layer.objects.active = cam
bpy.ops.object.select_all(action='DESELECT')
cam.select_set(True)
bpy.ops.nla.bake(frame_start=0, frame_end=120, only_selected=True, visual_keying=True, clear_constraints=True, bake_types={'OBJECT'})
cam.animation_data.action.name = 'CAMERA_action'

if '--blend' in sys.argv:
    bpy.ops.wm.save_as_mainfile(filepath=sys.argv[sys.argv.index('--blend') + 1])
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_cameras=True, export_animations=True, export_apply=True,
    export_yup=True, export_vertex_color='ACTIVE', export_materials='EXPORT', export_image_format='JPEG',
    export_jpeg_quality=85, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
)
print('field ok', OUT, os.path.getsize(OUT) // 1024, 'KB')
