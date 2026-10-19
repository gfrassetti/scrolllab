# Kanvas / VESPER: aligera un GLB de Tripo (~45 MB, 1,4 M triángulos) para la web: baja la malla, apaga lo
# metálico (sin mapa de entorno se ve negro), achica las texturas a 1024 y exporta con JPEG.
#   blender -b --python lighten-glb.py -- <entrada.glb> <salida.glb> [triángulos=50000]
import bpy, os, sys

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
MAX_TRIS = int(args[2]) if len(args) > 2 else 50000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for ob in [o for o in bpy.data.objects if o.type == 'MESH']:
    bpy.context.view_layer.objects.active = ob
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if tris > MAX_TRIS:
        m = ob.modifiers.new('dec', 'DECIMATE')
        m.ratio = MAX_TRIS / tris
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
    print(ob.name, 'tris', sum(len(p.vertices) - 2 for p in ob.data.polygons))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85)
print('lite ok', OUT, os.path.getsize(OUT) // 1024, 'KB')
