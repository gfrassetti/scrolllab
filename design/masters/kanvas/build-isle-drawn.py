# Kanvas / VESPER: la isla flotante, dibujada (2026-10-18). Reemplaza a la de juguete (build-isle.py) con las
# mismas medidas, así las cámaras de las secciones que la filman (el Faro, los juramentos, el cierre, el
# escaneo y el centro del mundo) la encuadran igual: ~5 de ancho, el tope en z ≈ 0.15, la torre en
# (0.3, -0.2). Piezas generadas (design/masters/kanvas/3d): la isla (SAM 3D), la torre, piedras, arbustos y
# la cerca. Sin cámara: cada sección pone la suya.
#   blender -b --python build-isle-drawn.py -- <salida.glb>
import bpy, math, os, sys
from mathutils import Matrix, Vector

OUT = sys.argv[sys.argv.index('--') + 1]
A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '3d')
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def load(name, path, max_tris):
    """Importa un GLB de SAM 3D, lo suelda, lo aligera, apaga lo metálico y deja el origen abajo al centro."""
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
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.object.mode_set(mode='OBJECT')
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if tris > max_tris:
        m = ob.modifiers.new('dec', 'DECIMATE')
        m.ratio = max_tris / tris
        m.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier='dec')
    for mat in ob.data.materials:
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        for link in list(bsdf.inputs['Metallic'].links):
            nt.links.remove(link)
        bsdf.inputs['Metallic'].default_value = 0.0
        for n in nt.nodes:
            if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] > 1024:
                n.image.scale(1024, 1024)
    bb = [Vector(c) for c in ob.bound_box]
    lo = min(v.z for v in bb)
    cx = (min(v.x for v in bb) + max(v.x for v in bb)) / 2
    cy = (min(v.y for v in bb) + max(v.y for v in bb)) / 2
    ob.data.transform(Matrix.Translation((-cx, -cy, -lo)))
    ob.data.update()
    return ob


def size(ob):
    bb = [Vector(c) for c in ob.bound_box]
    return Vector((max(v.x for v in bb) - min(v.x for v in bb), max(v.y for v in bb) - min(v.y for v in bb), max(v.z for v in bb) - min(v.z for v in bb)))


# la isla: 5 de ancho, el tope (lo más alto, salvo arbustitos) en z = 0.15
isle = load('isle', os.path.join(A, 'island-sam.glb'), 40000)
d = size(isle)
s = 5.0 / max(d.x, d.y)
# más baja que la generada (las raíces bajaban mucho): las cámaras de las secciones esperan ~2.7 de alto
sz = 2.9 / d.z
isle.scale = (s, s, sz)
isle.location = (0, 0, 0.15 - d.z * sz * 0.96)

# la torre del Faro, donde estaba la de antes
tower = load('tower', os.path.join(A, 'tower-arc-sam.glb'), 30000)
ts = 5.0 / size(tower).z
tower.scale = (ts, ts, ts)
tower.location = (0.3, -0.2, 0.05)


def scatter(name, path, tris, spots):
    proto = load(name, path, tris)
    base = 1.0 / size(proto).z
    for i, (x, y, z, h, rot) in enumerate(spots):
        o = proto if i == 0 else proto.copy()
        if i:
            sc.collection.objects.link(o)
            o.name = f'{name}_{i}'
        o.scale = (base * h,) * 3
        o.rotation_euler.z = math.radians(rot)
        o.location = (x, y, z)


# sobre la isla: piedras, arbustos y una cerca; y piedras sueltas flotando alrededor
scatter('rocks', os.path.join(A, 'rocks-sam.glb'), 6000, [
    (-1.2, -1.2, 0.08, 0.35, 20), (1.4, 0.9, 0.08, 0.3, 140), (-0.9, 1.3, 0.08, 0.28, 260),
    (-2.6, 1.6, -0.9, 0.45, 30), (2.8, -1.1, -0.6, 0.4, 120), (1.9, 2.6, -1.5, 0.35, 210), (-2.4, -2.3, -1.2, 0.3, 300),
])
scatter('bush', os.path.join(A, 'bush-sam.glb'), 6000, [
    (-1.5, 0.2, 0.08, 0.4, 0), (1.2, -1.3, 0.08, 0.36, 90), (0.9, 1.6, 0.08, 0.32, 200), (-0.4, -1.8, 0.08, 0.3, 300),
])
scatter('fence', os.path.join(A, 'fence-sam.glb'), 5000, [(-0.6, -1.4, 0.08, 0.45, 15)])

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_apply=True, export_yup=True, export_image_format='JPEG',
    export_jpeg_quality=85, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
)
print('isle ok', OUT, os.path.getsize(OUT) // 1024, 'KB', 'isle size', tuple(round(v * s, 2) for v in d))
