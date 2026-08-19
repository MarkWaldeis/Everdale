# Rigged Character Package (5-Finger Humanoid Skeleton)

Dieses Verzeichnis enthält den vollständig geriggten Charakter mit anatomisch korrektem **71-Bone-Skelett** inklusive aller **10 Finger** (3 Phalangen pro Finger) und weichem Geodesic Vertex Skinning.

---

## 📁 Dateistruktur

```
rigged_character/
├── medieval_girl_fully_rigged.glb   # Produktionsfertiges 3D GLB-Modell mit allen Knochen & Gewichten
├── medieval_girl_rigged.blend       # Blender 5.1 Projektdatei mit Armature, Posen & Studio-Setup
├── auto_rig_generator.py            # Automatisches Python-Rigging- & Skinning-Skript
└── renders/                         # High-Res Renderings und Posen-Demonstrationen
    ├── hand_xray_skeleton.png       # X-Ray Nahaufnahme der Fingerknochen
    ├── full_body_skeleton.png       # Vollkörper-Skelettübersicht
    ├── pose_fist.png                # Faust-Geste (Mesh-Deformation)
    ├── pose_peace_sign.png          # Peace / V-Geste (Mesh-Deformation)
    └── pose_waving.png              # Winkende Charakter-Pose
```

---

## 🦴 Skelett & Knochenhierarchie

* **Gesamtknochenanzahl:** 71 Bones
* **Grundkörper (41 Bones):** Root, Hip, Pelvis, Spines, Neck, Head, Clavicles, Arms, Legs, Feet, Twist-Bones.
* **Finger (30 Bones):**
  * **Linke Hand:**
    * Daumen: `L_Thumb01` → `L_Thumb02` → `L_Thumb03`
    * Zeigefinger: `L_Index01` → `L_Index02` → `L_Index03`
    * Mittelfinger: `L_Middle01` → `L_Middle02` → `L_Middle03`
    * Ringfinger: `L_Ring01` → `L_Ring02` → `L_Ring03`
    * Kleiner Finger: `L_Pinky01` → `L_Pinky02` → `L_Pinky03`
  * **Rechte Hand:**
    * Daumen: `R_Thumb01` → `R_Thumb02` → `R_Thumb03`
    * Zeigefinger: `R_Index01` → `R_Index02` → `R_Index03`
    * Mittelfinger: `R_Middle01` → `R_Middle02` → `R_Middle03`
    * Ringfinger: `R_Ring01` → `R_Ring02` → `R_Ring03`
    * Kleiner Finger: `R_Pinky01` → `R_Pinky02` → `R_Pinky03`

---

## 🚀 Verwendung in Three.js / Web

Das GLB-Modell kann direkt mit `THREE.GLTFLoader` geladen werden. Jedes Glied kann über `model.getObjectByName('L_Index01')` oder `THREE.AnimationMixer` frei animiert und artikuliert werden.
