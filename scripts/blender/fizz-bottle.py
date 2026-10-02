"""
FIZZ — botella de vidrio del hero (modelo genérico y reemplazable).

Una botella de 1 L con tapón mecánico (porcelana, sello de goma y alambre).
Arma todo desde cero, guarda la escena con luces y exporta el GLB que usa
`fizz/HeroBubbles.jsx`:

    blender --background --python scripts/blender/fizz-bottle.py -- [preview.png]

Salidas:
    design/masters/fizz/soda-bottle.blend   escena editable (botella + luces + cámara)
    public/fizz/soda-bottle.glb             lo que carga el hero

Mallas, y el hero las reconoce por nombre: `glass`, `liquid`, `label`,
`stopper`, `seal` y `wire`. Si cambiás la forma, mantené esos nombres: de ahí
salen el vidrio con transmisión, el tinte del sabor, las burbujas de adentro,
la etiqueta y los materiales del tapón. Medidas en centímetros (se exporta en
metros).
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLEND_OUT = os.path.join(ROOT, 'design', 'masters', 'fizz', 'soda-bottle.blend')
GLB_OUT = os.path.join(ROOT, 'public', 'fizz', 'soda-bottle.glb')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW_OUT = ARGS[0] if ARGS else ''

CM = 0.01
SEGMENTS = 112
FLUTES = 24

# Perfil exterior (radio, altura): base con picadura, anillo en relieve, cuerpo
# liso para la etiqueta, hombro, cuello y aro donde calza el alambre.
OUTER = [
    (0.0, 0.62), (1.8, 0.55), (3.0, 0.3), (3.62, 0.0), (3.98, 0.12),
    (4.08, 0.55), (4.08, 1.2), (4.14, 1.34), (4.14, 1.7), (4.08, 1.84),
    (4.05, 2.4), (4.05, 3.4), (4.12, 3.54), (4.12, 3.9), (4.05, 4.04),
    (4.05, 18.0), (4.12, 18.14), (4.12, 18.5), (4.05, 18.64),
    (4.0, 19.3), (3.82, 20.5), (3.45, 21.8), (2.95, 23.0), (2.45, 24.1),
    (2.1, 25.1), (1.88, 26.0), (1.8, 26.8), (1.8, 27.3),
    (2.0, 27.42), (2.14, 27.62), (2.14, 27.95), (2.04, 28.18), (1.84, 28.3),
    (1.74, 28.42), (1.52, 28.46),
]
INNER = [
    (1.34, 28.42), (1.3, 27.6), (1.32, 26.0), (1.5, 25.0), (1.9, 24.0),
    (2.5, 22.9), (3.1, 21.7), (3.5, 20.5), (3.68, 19.3), (3.74, 18.0),
    (3.74, 1.9), (3.62, 1.3), (3.2, 1.0), (2.0, 1.12), (0.0, 1.18),
]
FILL = 23.4
LIQUID = [
    (0.0, 1.21), (2.0, 1.15), (3.18, 1.03), (3.6, 1.33), (3.71, 1.95),
    (3.71, 18.0), (3.65, 19.3), (3.47, 20.5), (3.07, 21.7), (2.47, 22.9),
    (2.3, FILL - 0.04), (2.2, FILL + 0.04), (1.8, FILL), (0.0, FILL),
]
STOPPER = [
    (0.0, 28.78), (1.5, 28.78), (1.6, 28.9), (1.6, 29.15), (1.46, 29.3),
    (1.58, 29.45), (1.7, 29.65), (1.7, 30.2), (1.5, 30.75), (1.0, 31.1),
    (0.0, 31.2),
]
SEAL = [
    (1.5, 28.4), (1.78, 28.42), (1.84, 28.56), (1.78, 28.74), (1.5, 28.78),
]
FLUTE_BAND = (1.9, 3.3)
LABEL_BAND = (6.0, 14.0)
LABEL_ARC = math.radians(66)
NECK_Z = 27.12
PIVOT = (2.0, NECK_Z + 0.4)


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def resample(points, spacing, smooth=3):
    """Polilínea → muestras parejas, con las esquinas apenas redondeadas."""
    out = [points[0]]
    for (r0, z0), (r1, z1) in zip(points, points[1:]):
        steps = max(1, round(math.hypot(r1 - r0, z1 - z0) / spacing))
        for i in range(1, steps + 1):
            t = i / steps
            out.append((r0 + (r1 - r0) * t, z0 + (z1 - z0) * t))
    for _ in range(smooth):
        nxt = [out[0]]
        for a, b, c in zip(out, out[1:], out[2:]):
            nxt.append(((a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4))
        nxt.append(out[-1])
        out = nxt
    return out


def lathe(name, profile, segments, offset=None):
    """Revoluciona `profile` alrededor de Z. `offset(i, r, z, theta)` suma radio."""
    verts, rings = [], []
    for i, (r, z) in enumerate(profile):
        if r < 1e-6:
            rings.append([len(verts)])
            verts.append((0.0, 0.0, z * CM))
            continue
        ring = []
        for s in range(segments):
            theta = 2 * math.pi * s / segments
            rr = r + (offset(i, r, z, theta) if offset else 0.0)
            ring.append(len(verts))
            verts.append((rr * math.sin(theta) * CM, -rr * math.cos(theta) * CM, z * CM))
        rings.append(ring)

    faces = []
    for a, b in zip(rings, rings[1:]):
        for s in range(segments):
            n = (s + 1) % segments
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                faces.append((a[0], b[n], b[s]))
            elif len(b) == 1:
                faces.append((a[s], a[n], b[0]))
            else:
                faces.append((a[s], a[n], b[n], b[s]))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def material(name, color, *, roughness=0.5, metallic=0.0, transmission=0.0, ior=1.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['IOR'].default_value = ior
    bsdf.inputs['Transmission Weight'].default_value = transmission
    return mat


def build_glass():
    outer = resample(OUTER, 0.16)
    inner = resample(INNER, 0.5)
    lo, hi = FLUTE_BAND

    def flutes(i, r, z, theta):
        if i >= len(outer):
            return 0.0
        window = smoothstep(lo, lo + 0.5, z) * (1 - smoothstep(hi - 0.5, hi, z))
        return -0.09 * window * (0.5 - 0.5 * math.cos(FLUTES * theta))

    obj = lathe('glass', outer + inner, SEGMENTS, flutes)
    obj.data.materials.append(
        material('glass', (0.94, 1.0, 0.97), roughness=0.03, transmission=1.0, ior=1.5)
    )
    return obj


def build_liquid():
    obj = lathe('liquid', resample(LIQUID, 0.5, smooth=2), 64)
    obj.data.materials.append(
        material('liquid', (1.0, 0.36, 0.7), roughness=0.0, transmission=1.0, ior=1.33)
    )
    return obj


def build_stopper():
    obj = lathe('stopper', resample(STOPPER, 0.1, smooth=2), 64)
    obj.data.materials.append(
        material('stopper', (0.97, 0.95, 0.9), roughness=0.2, metallic=0.0, ior=1.55)
    )
    return obj


def build_seal():
    obj = lathe('seal', resample(SEAL, 0.05, smooth=1), 64)
    obj.data.materials.append(material('seal', (1.0, 0.24, 0.65), roughness=0.55))
    return obj


def tube(name, points, radius, sides=10, closed=False):
    """Barrido de un círculo a lo largo de una polilínea (alambre)."""
    n = len(points)
    verts, faces = [], []
    for i, p in enumerate(points):
        a = points[(i - 1) % n] if closed or i > 0 else p
        b = points[(i + 1) % n] if closed or i < n - 1 else p
        t = Vector((b[0] - a[0], b[1] - a[1], b[2] - a[2])).normalized()
        ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        u = t.cross(ref).normalized()
        v = t.cross(u).normalized()
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            q = Vector(p) + (u * math.cos(ang) + v * math.sin(ang)) * radius
            verts.append((q.x * CM, q.y * CM, q.z * CM))
    span = n if closed else n - 1
    for i in range(span):
        j = (i + 1) % n
        for k in range(sides):
            k2 = (k + 1) % sides
            faces.append((i * sides + k, i * sides + k2, j * sides + k2, j * sides + k))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def bezier(p0, p1, p2, p3, steps=28):
    out = []
    for i in range(steps + 1):
        t = i / steps
        out.append(tuple(
            (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
            for a, b, c, d in zip(p0, p1, p2, p3)
        ))
    return out


def build_wire():
    """Aro bajo el aro del cuello + arco que pasa por encima del tapón."""
    ring = [
        (2.16 * math.cos(2 * math.pi * i / 64), 2.16 * math.sin(2 * math.pi * i / 64), NECK_Z)
        for i in range(64)
    ]
    px, pz = PIVOT
    left = bezier((-px, 0, pz), (-px, 0, pz + 2.2), (-1.5, 0, 32.4), (0, 0, 32.4))
    right = bezier((0, 0, 32.4), (1.5, 0, 32.4), (px, 0, pz + 2.2), (px, 0, pz))
    arch = tube('wire_arch', left + right[1:], 0.1)
    loop = tube('wire_ring', ring, 0.1, closed=True)
    for o in (arch, loop):
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = 'wire'
    obj.data.name = 'wire'
    obj.data.materials.append(
        material('wire', (0.8, 0.8, 0.82), roughness=0.28, metallic=1.0)
    )
    return obj


def build_label():
    """Parche curvo sobre la zona lisa, con UV 0–1 para la textura de marca."""
    cols, rows = 40, 4
    z0, z1 = LABEL_BAND
    radius = 4.05 + 0.025
    verts, uvs, faces = [], [], []
    for j in range(rows + 1):
        v = j / rows
        for i in range(cols + 1):
            u = i / cols
            theta = -LABEL_ARC + 2 * LABEL_ARC * u
            verts.append((
                radius * math.sin(theta) * CM,
                -radius * math.cos(theta) * CM,
                (z0 + (z1 - z0) * v) * CM,
            ))
            uvs.append((u, v))
    for j in range(rows):
        for i in range(cols):
            a = j * (cols + 1) + i
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))

    mesh = bpy.data.meshes.new('label')
    mesh.from_pydata(verts, [], faces)
    layer = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        layer.data[loop.index].uv = uvs[loop.vertex_index]
    mesh.shade_smooth()
    obj = bpy.data.objects.new('label', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material('label', (1.0, 0.953, 0.886), roughness=0.62))
    return obj


def area_light(name, location, rotation, size, energy, color=(1, 1, 1)):
    data = bpy.data.lights.new(name, 'AREA')
    data.shape = 'RECTANGLE'
    data.size, data.size_y = size
    data.energy = energy
    data.color = color
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.collection.objects.link(obj)
    return obj


def build_studio():
    """Estudio de producto: dos cajas de luz laterales, cenital y fondo de color."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new('studio')
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (1.0, 0.05, 0.38, 1.0)
    bg.inputs['Strength'].default_value = 1.0
    scene.world = world

    rad = math.radians
    area_light('key', (-0.4, -0.38, 0.22), (rad(78), 0, rad(-48)), (0.18, 0.6), 34)
    area_light('rim', (0.42, 0.2, 0.18), (rad(84), 0, rad(118)), (0.1, 0.6), 26, (1.0, 0.93, 0.86))
    area_light('top', (0.0, -0.05, 0.5), (0, 0, 0), (0.3, 0.3), 9)

    cam_data = bpy.data.cameras.new('camera')
    cam_data.lens = 85
    cam = bpy.data.objects.new('camera', cam_data)
    cam.location = (0.0, -1.02, 0.165)
    cam.rotation_euler = (rad(89.2), 0, 0)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = [
        build_glass(), build_liquid(), build_label(),
        build_stopper(), build_seal(), build_wire(),
    ]
    build_studio()

    os.makedirs(os.path.dirname(BLEND_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )

    scene = bpy.context.scene
    if PREVIEW_OUT:
        try:
            scene.render.engine = 'CYCLES'
        except TypeError as err:
            print('render engine:', err)
        scene.cycles.samples = 64
        scene.render.resolution_x = 720
        scene.render.resolution_y = 1080
        scene.render.filepath = PREVIEW_OUT
        bpy.ops.render.render(write_still=True)
        scene.render.filepath = '//soda-bottle-preview.png'

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)

    tris = sum(len(p.vertices) - 2 for obj in parts for p in obj.data.polygons)
    print(f'FIZZ bottle: {tris} tris, glb {os.path.getsize(GLB_OUT) / 1024:.0f} KB')


main()
