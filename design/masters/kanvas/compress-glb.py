# Kanvas / VESPER: comprime un GLB para la web sin tocar cómo se ve: geometría con Draco (cuantizada, la
# diferencia no se ve a la distancia de la cámara) y texturas en WebP. Los personajes de Tripo pesaban
# 1,8 MB cada uno sin comprimir y en una conexión lenta la carga del hero tardaba (2026-10-19).
#   blender -b --python compress-glb.py -- <entrada.glb> <salida.glb>
import bpy, os, sys

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
# solo el color: el trazo de tinta (ink.js) no usa relieve, rugosidad ni metal; sin esas texturas pesa menos
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        continue
    for inp in bsdf.inputs:
        if inp.identifier != 'Base Color':
            for link in list(inp.links):
                nt.links.remove(link)

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    export_image_format='WEBP',
    export_image_quality=82,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=10,
    export_draco_position_quantization=12,
    export_draco_normal_quantization=8,
    export_draco_texcoord_quantization=11,
    export_draco_color_quantization=8,
)
print('compress ok', OUT, os.path.getsize(SRC) // 1024, '->', os.path.getsize(OUT) // 1024, 'KB')
