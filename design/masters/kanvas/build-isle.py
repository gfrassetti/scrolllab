# Kanvas — escena de prueba propia: una isla flotante con una torre y un cristal, sobre nubes.
# Sale como GLB con su cámara animada adentro (la cámara recorre la escena: empieza cerca del
# cristal y se aleja hasta ver la isla entera). La web reproduce esa animación con el scroll.
#   blender -b --python build-isle.py -- <salida.glb>
import bpy, bmesh, math, random, sys
from mathutils import Vector, noise

OUT = sys.argv[sys.argv.index('--') + 1]
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 0, 120
sc.render.fps = 24


def mat(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 0.9
    return m


def color_verts(ob, fn):
    """Color por vértice (la web lo usa para el sombreado pintado)."""
    me = ob.data
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            ca.data[li].color = (*fn(ob.matrix_world @ v), 1)


def lerp3(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


ROCK_TOP = (0.62, 0.50, 0.78)
ROCK_LOW = (0.24, 0.17, 0.36)
GRASS = (0.42, 0.72, 0.62)

# --- la isla: una piedra que se afina hacia abajo, con el borde de arriba con pasto -------------
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1)
isle = bpy.context.active_object
isle.name = 'isle'
bm = bmesh.new(); bm.from_mesh(isle.data)
for v in bm.verts:
    x, y, z = v.co
    if z < 0:
        s = 1 + z * 0.15
        v.co.x *= s; v.co.y *= s
        v.co.z = z * 2.4
    else:
        v.co.z = z * 0.22
    n = noise.noise(Vector((x * 2.2, y * 2.2, z * 2.2)))
    v.co += v.co.normalized() * n * 0.18
bm.to_mesh(isle.data); bm.free()
isle.scale = (2.2, 2.2, 1.0)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.shade_smooth()
color_verts(isle, lambda p: GRASS if p.z > 0.12 else lerp3(ROCK_LOW, ROCK_TOP, max(0.0, min(1.0, (p.z + 2.4) / 2.5))))

# --- la torre: tres cuerpos que se afinan, con un balcón y la punta --------------------------
TOWER = (0.93, 0.86, 0.74)
TRIM = (0.95, 0.55, 0.30)
parts = []
z = 0.15
for i, (r, h) in enumerate([(0.42, 1.3), (0.32, 1.0), (0.22, 0.8)]):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=h, location=(0.3, -0.2, z + h / 2))
    parts.append((bpy.context.active_object, TOWER))
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r * 1.18, depth=0.08, location=(0.3, -0.2, z + h))
    parts.append((bpy.context.active_object, TRIM))
    z += h + 0.08
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.3, depth=0.7, location=(0.3, -0.2, z + 0.35))
parts.append((bpy.context.active_object, TRIM))
top = z + 0.7
# ventanas: unas cajitas oscuras alrededor
for k in range(6):
    a = k / 6 * math.tau
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.3 + math.cos(a) * 0.42, -0.2 + math.sin(a) * 0.42, 0.9))
    w = bpy.context.active_object
    w.scale = (0.05, 0.05, 0.16); w.rotation_euler.z = a
    parts.append((w, (0.18, 0.12, 0.28)))

# --- el cristal que flota sobre la torre ---------------------------------------------------
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.32, location=(0.3, -0.2, top + 0.6))
cr = bpy.context.active_object
cr.scale = (0.7, 0.7, 1.6)
parts.append((cr, (0.35, 0.95, 0.88)))

# --- piedras chicas flotando alrededor ----------------------------------------------------
for k in range(9):
    a = random.uniform(0, math.tau)
    d = random.uniform(2.6, 3.8)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.12, 0.32), location=(math.cos(a) * d, math.sin(a) * d, random.uniform(-0.6, 1.6)))
    rk = bpy.context.active_object
    rk.scale.z = 0.7
    parts.append((rk, lerp3(ROCK_LOW, ROCK_TOP, random.random())))

# --- nubes: bolas blandas abajo -------------------------------------------------------------
for k in range(26):
    a = random.uniform(0, math.tau)
    d = random.uniform(1.0, 6.5)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=random.uniform(0.6, 1.4), location=(math.cos(a) * d, math.sin(a) * d, random.uniform(-3.4, -2.4)))
    cl = bpy.context.active_object
    cl.scale.z = 0.55
    bpy.ops.object.shade_smooth()
    parts.append((cl, (0.98, 0.88, 0.86)))

# --- el mar, abajo de todo ------------------------------------------------------------------
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -4.3))
parts.append((bpy.context.active_object, (0.23, 0.30, 0.55)))

# --- tres viajeros encapuchados con faroles, en el borde de la isla, mirando el horizonte -----
CLOAKS = [(0.20, 0.62, 0.62), (0.93, 0.47, 0.25), (0.48, 0.30, 0.55)]
SKIN = (0.96, 0.80, 0.68)
for i, (x, y, h, cloak) in enumerate([(-1.25, -1.35, 0.78, CLOAKS[0]), (-0.55, -1.75, 0.66, CLOAKS[1]), (0.2, -1.92, 0.72, CLOAKS[2])]):
    base = 0.18
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.2 * h / 0.7, radius2=0.07, depth=h * 0.78, location=(x, y, base + h * 0.39))
    parts.append((bpy.context.active_object, cloak))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.085 * h / 0.7, location=(x, y - 0.02, base + h * 0.86))
    bpy.ops.object.shade_smooth()
    parts.append((bpy.context.active_object, SKIN))
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.12 * h / 0.7, radius2=0.0, depth=h * 0.36, location=(x, y + 0.02, base + h * 0.98))
    hood = bpy.context.active_object
    hood.rotation_euler.x = -0.25
    parts.append((hood, cloak))
    # el bastón con su farol
    sx = x + 0.17
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.012, depth=h * 1.15, location=(sx, y - 0.04, base + h * 0.57))
    parts.append((bpy.context.active_object, (0.30, 0.20, 0.16)))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.045, location=(sx, y - 0.04, base + h * 1.17))
    lamp = bpy.context.active_object
    lamp.name = f'lantern_{i}'
    parts.append((lamp, (1.0, 0.86, 0.45)))

for ob, col in parts:
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    color_verts(ob, lambda p, c=col: c)

# --- la cámara: empieza en el cristal y se aleja girando hasta ver la isla entera ------------
cam_data = bpy.data.cameras.new('CAMERA')
cam_data.lens = 40
cam = bpy.data.objects.new('CAMERA', cam_data)
sc.collection.objects.link(cam)
target = bpy.data.objects.new('Camera_Target', None)
sc.collection.objects.link(target)
con = cam.constraints.new('TRACK_TO')
con.target = target
con.track_axis = 'TRACK_NEGATIVE_Z'
con.up_axis = 'UP_Y'
keys = [
    (0, (1.4, -13.5, -3.7), (0.0, 0.0, -0.9)),      # a ras del mar: la isla sobre el horizonte
    (40, (0.9, -5.6, 0.75), (-0.55, -1.6, 0.62)),   # sube hasta los viajeros
    (80, (3.8, -7.6, 2.4), (0.0, -0.5, 0.9)),
    (120, (7.6, -10.6, 3.4), (0.0, 0.0, 0.0)),       # la isla entera
]
for f, cp, tp in keys:
    cam.location = cp; cam.keyframe_insert('location', frame=f)
    target.location = tp; target.keyframe_insert('location', frame=f)
sc.camera = cam
# el constraint se hornea a la rotación (glTF no exporta constraints)
bpy.context.view_layer.objects.active = cam
cam.select_set(True)
bpy.ops.nla.bake(frame_start=0, frame_end=120, only_selected=True, visual_keying=True, clear_constraints=True, bake_types={'OBJECT'})
cam.animation_data.action.name = 'CAMERA_action'

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_cameras=True, export_animations=True,
    export_apply=True, export_yup=True, export_vertex_color='ACTIVE', export_materials='EXPORT',
)
print('isle ok', OUT)
