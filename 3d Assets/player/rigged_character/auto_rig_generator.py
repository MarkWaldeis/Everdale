import bpy
import mathutils
import numpy as np
import os
import math
import shutil

def dist_point_to_segment(p, a, b):
    ab = b - a
    ab_len_sq = ab.length_squared
    if ab_len_sq < 1e-8:
        return (p - a).length
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab_len_sq))
    projection = a + t * ab
    return (p - projection).length

def build_perfect_rig():
    orig_glb = r"c:\Users\Mark Waldeis\Desktop\Everdale Kopie\3d Assets\player\medieval+girl+3d+model (2).glb"
    target_glb = r"c:\Users\Mark Waldeis\Desktop\Everdale Kopie\3d Assets\player\medieval+girl+fully_rigged.glb"
    blend_file = r"c:\Users\Mark Waldeis\Desktop\Everdale Kopie\3d Assets\player\medieval_girl_rigged.blend"
    
    artifact_dir = r"C:\Users\Mark Waldeis\.gemini\antigravity\brain\937708ea-285c-4d81-8407-a642b3af6ff2"
    render_full = os.path.join(artifact_dir, "rigged_character_full_skeleton.png")
    render_xray = os.path.join(artifact_dir, "rigged_character_hand_xray_skeleton.png")
    render_fist = os.path.join(artifact_dir, "showcase_fist_hand.png")
    render_peace = os.path.join(artifact_dir, "showcase_peace_sign.png")
    render_waving = os.path.join(artifact_dir, "showcase_waving_character.png")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=orig_glb)

    armature = None
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE': armature = obj
        elif obj.type == 'MESH' and 'tripo' in obj.name.lower(): mesh_obj = obj

    print(f"Loaded: Armature={armature.name}, Mesh={mesh_obj.name}")

    # Set Armature to Edit Mode
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = armature.data.edit_bones

    # Head bone
    head = edit_bones.get('Head')
    if head:
        head.tail = mathutils.Vector((head.head.x, head.head.y, head.head.z + 0.14))

    # Hand bones
    l_hand = edit_bones.get('L_Hand')
    r_hand = edit_bones.get('R_Hand')

    if l_hand:
        l_hand.head = mathutils.Vector((0.155, 0.005, 0.465))
        l_hand.tail = mathutils.Vector((0.148, 0.000, 0.435))

    if r_hand:
        r_hand.head = mathutils.Vector((-0.155, 0.005, 0.465))
        r_hand.tail = mathutils.Vector((-0.148, 0.000, 0.435))

    # Exact measured finger coordinates
    finger_trajectories = [
        # (Name, Knuckle, Tip)
        ('Thumb',  mathutils.Vector((0.165, 0.020, 0.440)), mathutils.Vector((0.125, 0.050, 0.370))),
        ('Index',  mathutils.Vector((0.138, 0.020, 0.432)), mathutils.Vector((0.130, 0.020, 0.370))),
        ('Middle', mathutils.Vector((0.162, -0.005, 0.432)), mathutils.Vector((0.160, -0.010, 0.380))),
        ('Ring',   mathutils.Vector((0.145, -0.025, 0.432)), mathutils.Vector((0.130, -0.030, 0.368))),
        ('Pinky',  mathutils.Vector((0.125, -0.040, 0.430)), mathutils.Vector((0.118, -0.060, 0.365))),
    ]

    created_bones = []

    def create_finger_bones(hand_bone, prefix, is_right=False):
        for fname, knuckle, tip in finger_trajectories:
            k = knuckle.copy()
            t = tip.copy()
            if is_right:
                k.x = -k.x
                t.x = -t.x
            
            vec = t - k
            p0 = k
            p1 = k + vec * 0.40
            p2 = k + vec * 0.75
            p3 = t

            points = [(p0, p1), (p1, p2), (p2, p3)]
            prev = hand_bone

            for idx, (h_pt, t_pt) in enumerate(points):
                b_name = f"{prefix}_{fname}0{idx+1}"
                if b_name in edit_bones:
                    edit_bones.remove(edit_bones[b_name])
                b = edit_bones.new(b_name)
                b.parent = prev
                b.use_connect = (idx > 0)
                b.head = h_pt
                b.tail = t_pt
                created_bones.append(b_name)
                prev = b

    create_finger_bones(l_hand, "L", is_right=False)
    create_finger_bones(r_hand, "R", is_right=True)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Skinning Weights
    for b_name in created_bones:
        if b_name not in mesh_obj.vertex_groups:
            mesh_obj.vertex_groups.new(name=b_name)

    vg_map = {vg.name: vg for vg in mesh_obj.vertex_groups}

    bone_segments = {}
    for b in armature.data.bones:
        h = armature.matrix_world @ b.head_local
        t = armature.matrix_world @ b.tail_local
        bone_segments[b.name] = (h, t)

    l_finger_names = [b for b in created_bones if b.startswith('L_')]
    r_finger_names = [b for b in created_bones if b.startswith('R_')]

    l_hand_vg = vg_map.get('L_Hand')
    r_hand_vg = vg_map.get('R_Hand')
    l_hand_idx = l_hand_vg.index if l_hand_vg else None
    r_hand_idx = r_hand_vg.index if r_hand_vg else None

    mw = mesh_obj.matrix_world

    for v in mesh_obj.data.vertices:
        v_world = mw @ v.co
        
        # Left Hand
        is_l_hand = (l_hand_idx is not None and any(g.group == l_hand_idx for g in v.groups)) or (0.10 < v_world.x < 0.22 and 0.34 < v_world.z < 0.48)
        if is_l_hand:
            dists = []
            p_head, p_tail = bone_segments['L_Hand']
            d_palm = dist_point_to_segment(v_world, p_head, p_tail)
            dists.append(('L_Hand', d_palm, 1.2))

            for fb in l_finger_names:
                f_head, f_tail = bone_segments[fb]
                d = dist_point_to_segment(v_world, f_head, f_tail)
                dists.append((fb, d, 2.6))

            dists.sort(key=lambda x: x[1])
            top4 = dists[:4]
            weights = []
            for name, d, factor in top4:
                w = 1.0 / (max(d, 0.002) ** factor)
                weights.append((name, w))

            total_w = sum(w for _, w in weights)
            for name, w in weights:
                norm_w = w / total_w
                if norm_w > 0.02:
                    vg_map[name].add([v.index], norm_w, 'REPLACE')
                elif name in vg_map:
                    vg_map[name].remove([v.index])

        # Right Hand
        is_r_hand = (r_hand_idx is not None and any(g.group == r_hand_idx for g in v.groups)) or (-0.22 < v_world.x < -0.10 and 0.34 < v_world.z < 0.48)
        if is_r_hand:
            dists = []
            p_head, p_tail = bone_segments['R_Hand']
            d_palm = dist_point_to_segment(v_world, p_head, p_tail)
            dists.append(('R_Hand', d_palm, 1.2))

            for fb in r_finger_names:
                f_head, f_tail = bone_segments[fb]
                d = dist_point_to_segment(v_world, f_head, f_tail)
                dists.append((fb, d, 2.6))

            dists.sort(key=lambda x: x[1])
            top4 = dists[:4]
            weights = []
            for name, d, factor in top4:
                w = 1.0 / (max(d, 0.002) ** factor)
                weights.append((name, w))

            total_w = sum(w for _, w in weights)
            for name, w in weights:
                norm_w = w / total_w
                if norm_w > 0.02:
                    vg_map[name].add([v.index], norm_w, 'REPLACE')
                elif name in vg_map:
                    vg_map[name].remove([v.index])

    print("Calculated skinning weights.")

    # 3D Visual Skeleton
    skel_col = bpy.data.collections.new("VisualSkeleton")
    bpy.context.scene.collection.children.link(skel_col)

    mat_bone = bpy.data.materials.new(name="Skeleton_Bone_Mat")
    bsdf_b = mat_bone.node_tree.nodes.get("Principled BSDF")
    if bsdf_b:
        bsdf_b.inputs['Base Color'].default_value = (0.0, 0.9, 1.0, 1.0)
        bsdf_b.inputs['Emission Color'].default_value = (0.0, 0.8, 1.0, 1.0)
        bsdf_b.inputs['Emission Strength'].default_value = 2.5

    mat_joint = bpy.data.materials.new(name="Skeleton_Joint_Mat")
    bsdf_j = mat_joint.node_tree.nodes.get("Principled BSDF")
    if bsdf_j:
        bsdf_j.inputs['Base Color'].default_value = (1.0, 0.85, 0.1, 1.0)
        bsdf_j.inputs['Emission Color'].default_value = (1.0, 0.7, 0.0, 1.0)
        bsdf_j.inputs['Emission Strength'].default_value = 3.0

    for b in armature.data.bones:
        h = armature.matrix_world @ b.head_local
        t = armature.matrix_world @ b.tail_local
        vec = t - h
        dist = vec.length
        if dist < 0.001: continue
        
        is_finger = any(x in b.name for x in ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'])
        r_joint = 0.0025 if is_finger else 0.012
        r_bone = 0.0014 if is_finger else 0.006

        bpy.ops.mesh.primitive_uv_sphere_add(radius=r_joint, location=h, segments=12, ring_count=8)
        j_obj = bpy.context.active_object
        j_obj.name = f"VisJoint_{b.name}"
        j_obj.data.materials.append(mat_joint)
        skel_col.objects.link(j_obj)
        bpy.context.scene.collection.objects.unlink(j_obj)

        mid = (h + t) * 0.5
        bpy.ops.mesh.primitive_cylinder_add(radius=r_bone, depth=dist, location=mid, vertices=10)
        b_obj = bpy.context.active_object
        b_obj.name = f"VisBone_{b.name}"
        b_obj.data.materials.append(mat_bone)
        
        up = mathutils.Vector((0, 0, 1))
        rot_quat = up.rotation_difference(vec.normalized())
        b_obj.rotation_mode = 'QUATERNION'
        b_obj.rotation_quaternion = rot_quat

        skel_col.objects.link(b_obj)
        bpy.context.scene.collection.objects.unlink(b_obj)

    # Studio Lights & Camera
    world = bpy.data.worlds.new("StudioWorld")
    bpy.context.scene.world = world
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs['Color'].default_value = (0.05, 0.06, 0.09, 1.0)
        bg.inputs['Strength'].default_value = 1.0

    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    floor_obj = bpy.context.active_object
    mat_floor = bpy.data.materials.new("StudioFloor")
    bsdf_f = mat_floor.node_tree.nodes.get("Principled BSDF")
    if bsdf_f:
        bsdf_f.inputs['Base Color'].default_value = (0.07, 0.08, 0.11, 1.0)
        bsdf_f.inputs['Roughness'].default_value = 0.35
    floor_obj.data.materials.append(mat_floor)

    key = bpy.data.lights.new("Key", 'AREA')
    key.energy = 150.0
    key.size = 1.8
    key.color = (1.0, 0.98, 0.94)
    k_obj = bpy.data.objects.new("Key", key)
    k_obj.location = (1.2, -1.8, 1.5)
    k_obj.rotation_euler = (math.radians(50), 0, math.radians(35))
    bpy.context.scene.collection.objects.link(k_obj)

    fill = bpy.data.lights.new("Fill", 'AREA')
    fill.energy = 65.0
    fill.size = 2.2
    fill.color = (0.65, 0.82, 1.0)
    f_obj = bpy.data.objects.new("Fill", fill)
    f_obj.location = (-1.5, -1.5, 1.2)
    f_obj.rotation_euler = (math.radians(45), 0, math.radians(-40))
    bpy.context.scene.collection.objects.link(f_obj)

    rim = bpy.data.lights.new("Rim", 'SPOT')
    rim.energy = 220.0
    rim.spot_size = math.radians(70)
    rim.color = (0.2, 0.9, 1.0)
    r_obj = bpy.data.objects.new("Rim", rim)
    r_obj.location = (0.0, 1.8, 1.6)
    r_obj.rotation_euler = (math.radians(-130), 0, 0)
    bpy.context.scene.collection.objects.link(r_obj)

    hand_spot = bpy.data.lights.new("HandSpot", 'POINT')
    hand_spot.energy = 20.0
    hand_spot.color = (1.0, 0.9, 0.75)
    hs_obj = bpy.data.objects.new("HandSpot", hand_spot)
    hs_obj.location = (0.22, -0.4, 0.50)
    bpy.context.scene.collection.objects.link(hs_obj)

    cam_data = bpy.data.cameras.new("MainCam")
    cam = bpy.data.objects.new("MainCam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items else 'BLENDER_EEVEE'
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080
    scene.render.image_settings.file_format = 'PNG'

    # Render 1: Full Body Skeleton
    print("Rendering 1: Full Body...")
    cam.location = mathutils.Vector((0.0, -2.1, 0.65))
    cam.rotation_euler = mathutils.Vector((math.radians(88), 0, 0))
    scene.render.filepath = render_full
    bpy.ops.render.render(write_still=True)

    # Render 2: Hand X-Ray Skeleton Close-Up
    print("Rendering 2: Hand X-Ray Skeleton...")
    orig_mat = mesh_obj.data.materials[0] if mesh_obj.data.materials else None
    xray_mat = bpy.data.materials.new("XRay_Skin")
    bsdf_x = xray_mat.node_tree.nodes.get("Principled BSDF")
    if bsdf_x:
        bsdf_x.inputs['Base Color'].default_value = (0.2, 0.45, 0.65, 1.0)
        bsdf_x.inputs['Alpha'].default_value = 0.38
        bsdf_x.inputs['Transmission Weight'].default_value = 0.65
    mesh_obj.data.materials[0] = xray_mat

    cam.location = mathutils.Vector((0.155, -0.40, 0.420))
    cam.rotation_euler = mathutils.Vector((math.radians(86), 0, math.radians(4)))
    scene.render.filepath = render_xray
    bpy.ops.render.render(write_still=True)

    # Restore material and hide visual skeleton for deformation renders
    if orig_mat: mesh_obj.data.materials[0] = orig_mat
    skel_col.hide_render = True

    # Poses
    def reset_pose():
        bpy.context.view_layer.objects.active = armature
        bpy.ops.object.mode_set(mode='POSE')
        for b in armature.pose.bones:
            b.rotation_mode = 'XYZ'
            b.rotation_euler = (0, 0, 0)
            b.location = (0, 0, 0)
        bpy.ops.object.mode_set(mode='OBJECT')

    # Render 3: Fist
    print("Rendering 3: Fist Pose...")
    reset_pose()
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    pb = armature.pose.bones
    fist_curls = {
        'Index':  [(70, 4, 0),  (85, 0, 0),  (75, 0, 0)],
        'Middle': [(75, 0, 0),  (90, 0, 0),  (80, 0, 0)],
        'Ring':   [(75, -4, 0), (90, 0, 0),  (80, 0, 0)],
        'Pinky':  [(75, -8, 0), (90, 0, 0),  (80, 0, 0)],
        'Thumb':  [(40, 30, -15), (55, 20, 0), (50, 10, 0)]
    }
    for f, angles in fist_curls.items():
        for i, (rx, ry, rz) in enumerate(angles):
            b = pb.get(f"L_{f}0{i+1}")
            if b: b.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
    bpy.ops.object.mode_set(mode='OBJECT')
    scene.render.filepath = render_fist
    bpy.ops.render.render(write_still=True)

    # Render 4: Peace Sign
    print("Rendering 4: Peace Sign Pose...")
    reset_pose()
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    pb = armature.pose.bones
    peace_curls = {
        'Index':  [(-5, 12, 0),  (0, 0, 0),   (0, 0, 0)],
        'Middle': [(-5, -8, 0),  (0, 0, 0),   (0, 0, 0)],
        'Ring':   [(75, -4, 0), (90, 0, 0),  (80, 0, 0)],
        'Pinky':  [(75, -8, 0), (90, 0, 0),  (80, 0, 0)],
        'Thumb':  [(45, 30, -15), (60, 20, 0), (55, 10, 0)]
    }
    for f, angles in peace_curls.items():
        for i, (rx, ry, rz) in enumerate(angles):
            b = pb.get(f"L_{f}0{i+1}")
            if b: b.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
    bpy.ops.object.mode_set(mode='OBJECT')
    scene.render.filepath = render_peace
    bpy.ops.render.render(write_still=True)

    # Render 5: Waving Full Body Character
    print("Rendering 5: Waving Character...")
    reset_pose()
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    pb = armature.pose.bones

    r_clav = pb.get('R_Clavicle')
    if r_clav: r_clav.rotation_euler = (math.radians(-5), math.radians(10), math.radians(15))
    r_up = pb.get('R_Upperarm')
    if r_up: r_up.rotation_euler = (math.radians(-60), math.radians(-50), math.radians(45))
    r_fore = pb.get('R_Forearm')
    if r_fore: r_fore.rotation_euler = (math.radians(-40), math.radians(65), math.radians(-30))
    r_hand = pb.get('R_Hand')
    if r_hand: r_hand.rotation_euler = (math.radians(15), math.radians(10), math.radians(20))

    wave_fingers = {
        'Index':  [(8, -12, 0),  (10, 0, 0),  (5, 0, 0)],
        'Middle': [(5, -3, 0),   (8, 0, 0),   (5, 0, 0)],
        'Ring':   [(8, 8, 0),    (12, 0, 0),  (8, 0, 0)],
        'Pinky':  [(12, 18, 0),  (15, 0, 0),  (10, 0, 0)],
        'Thumb':  [(-10, -25, 0),(-5, -15, 0),(0, 0, 0)]
    }
    for f, angles in wave_fingers.items():
        for i, (rx, ry, rz) in enumerate(angles):
            b = pb.get(f"R_{f}0{i+1}")
            if b: b.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))

    head = pb.get('Head')
    if head: head.rotation_euler = (math.radians(-5), math.radians(-8), math.radians(-10))

    bpy.ops.object.mode_set(mode='OBJECT')
    cam.location = mathutils.Vector((-0.1, -1.8, 0.72))
    cam.rotation_euler = mathutils.Vector((math.radians(88), 0, 0))
    scene.render.filepath = render_waving
    bpy.ops.render.render(write_still=True)

    reset_pose()
    skel_col.hide_render = False

    # Export production GLB
    print("Exporting production fully-rigged GLB...")
    bpy.ops.export_scene.gltf(
        filepath=target_glb,
        export_format='GLB',
        use_selection=False,
        export_skins=True,
        export_morph=True,
        export_all_influences=True
    )
    shutil.copy2(target_glb, orig_glb)
    print(f"Updated Everdale character asset: {orig_glb}")

    bpy.ops.wm.save_as_mainfile(filepath=blend_file)
    print(f"Saved Blend file: {blend_file}")
    print("=== PIPELINE EXECUTION COMPLETE ===")

if __name__ == '__main__':
    build_perfect_rig()
