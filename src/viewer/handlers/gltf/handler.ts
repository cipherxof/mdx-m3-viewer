import ModelViewer from '../../viewer';
import ShaderProgram from '../../gl/program';
import { PathSolver } from '../../handlerresource';
import { ImageTexture } from '../../imagetexture';
import CubeMap from '../../cubemap';
import Model from './model';
import GltfBatchGroup from './batchgroup';
import { getPrimitiveDefines, getMaterialDefines } from './flags';
import primitiveVert from './shaders/primitive.vert';
import metallicRoughnessFrag from './shaders/metallic-roughness.frag';

let shaders: { [key: string]: { [key: string]: ShaderProgram } } = {};

let env = {
  hasTextures: 0,
  specularTexture: <CubeMap | null>null,
  diffuseTexture: <CubeMap | null>null,
  brdfLUTTexture: <ImageTexture | null>null,
};

let globalDefines = [
  'USE_ENV',
];

export default {
  extensions: [['.gltf', 'text'], ['.glb', 'arrayBuffer']],
  load(viewer: ModelViewer) {
    let webgl = viewer.webgl;

    // Normal calculations when no tangents are present.
    if (!webgl.ensureExtension('OES_standard_derivatives')) {
      console.error('glTF: No standard derivatives support!');

      return false;
    }

    if (!webgl.ensureExtension('OES_element_index_uint')) {
      console.warn('glTF: No element index uint support! Some models will fail to load.');
    }

    // Optionally used by IBL to simulate roughness.
    if (!webgl.ensureExtension('EXT_shader_texture_lod')) {
      console.warn('glTF: No shader texture LOD support! This reduces the quality of environment mapping.');
    } else {
      globalDefines.push('USE_TEX_LOD');
    }

    return true;
  },
  resource: Model,
  async loadEnv(viewer: ModelViewer, specularSolver: PathSolver, diffuseSolver: PathSolver, brdfLUTSolver: PathSolver) {
    env.specularTexture = viewer.loadCubeMap(specularSolver);
    env.diffuseTexture = viewer.loadCubeMap(diffuseSolver);
    env.brdfLUTTexture = viewer.loadImageTexture(brdfLUTSolver);

    await viewer.whenLoaded([env.specularTexture, env.diffuseTexture, env.brdfLUTTexture]);

    if (env.specularTexture.ok && env.diffuseTexture.ok && env.brdfLUTTexture.ok) {
      env.hasTextures = 1;
    }
  },
  getShader(group: GltfBatchGroup) {
    let primitiveFlags = group.primitiveFlags;
    let materialFlags = group.materialFlags;

    if (!shaders[primitiveFlags]) {
      shaders[primitiveFlags] = {};
    }

    if (!shaders[primitiveFlags][materialFlags]) {
      let primitiveDefines = getPrimitiveDefines(primitiveFlags);
      let materialDefines = getMaterialDefines(materialFlags);
      let defines = [...primitiveDefines, ...materialDefines, ...globalDefines].map((value) => `#define ${value}`).join('\n') + '\n';
      let shader = group.model.viewer.webgl.createShaderProgram(defines + primitiveVert, defines + metallicRoughnessFrag);

      if (!shader || !shader.ok) {
        throw new Error('glTF: Failed to compile a shader!');
      }

      shaders[primitiveFlags][materialFlags] = shader;
    }

    return shaders[primitiveFlags][materialFlags];
  },
  shaders,
  env,
};
