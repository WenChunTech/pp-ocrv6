/* tslint:disable */
/* eslint-disable */

export type TensorData = Float32Array | number[];
export interface OrtLikeTensor {
    type?: "float32";
    data: TensorData;
    dims: number[];
}
export interface OrtLikeSession {
    inputNames?: string[];
    outputNames?: string[];
    run(feeds: Record<string, OrtLikeTensor>): Promise<Record<string, OrtLikeTensor>>;
}
export interface WasmOcrOptions {
    detInputName?: string;
    recInputName?: string;
    detLimitSideLen?: number;
    detLimitType?: "min" | "max" | "resize_long";
    detMaxSideLimit?: number;
    detScoreThreshold?: number;
    detBoxThreshold?: number;
    detUnclipRatio?: number;
    detMaxCandidates?: number;
    recImageShape?: [number, number, number];
    recBatchSize?: number;
    dropScore?: number;
}
export interface WasmOcrPoint { x: number; y: number; }
export interface WasmOcrTextRegion {
    boundingBox: WasmOcrPoint[];
    text: string;
    confidence: number;
}
export interface WasmOcrResult {
    width: number;
    height: number;
    textRegions: WasmOcrTextRegion[];
}



/**
 * Chroma subsampling format
 */
export enum ChromaSampling {
    /**
     * Both vertically and horizontally subsampled.
     */
    Cs420 = 0,
    /**
     * Horizontally subsampled.
     */
    Cs422 = 1,
    /**
     * Not subsampled.
     */
    Cs444 = 2,
    /**
     * Monochrome.
     */
    Cs400 = 3,
}

export class OarOcrWasm {
    free(): void;
    [Symbol.dispose](): void;
    constructor(det_session: OrtLikeSession, rec_session: OrtLikeSession, character_dict: string, options: any);
    predictBytes(bytes: Uint8Array): Promise<any>;
    predictRgba(width: number, height: number, rgba: Uint8Array): Promise<any>;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_oarocrwasm_free: (a: number, b: number) => void;
    readonly oarocrwasm_new: (a: any, b: any, c: number, d: number, e: any) => [number, number, number];
    readonly oarocrwasm_predictBytes: (a: number, b: number, c: number) => any;
    readonly oarocrwasm_predictRgba: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasm_bindgen_d9b77c16455757f4___convert__closures_____invoke___wasm_bindgen_d9b77c16455757f4___JsValue__core_9c09b708e10e29da___result__Result_____wasm_bindgen_d9b77c16455757f4___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_d9b77c16455757f4___convert__closures_____invoke___js_sys_10343e78df5acbe5___Function_fn_wasm_bindgen_d9b77c16455757f4___JsValue_____wasm_bindgen_d9b77c16455757f4___sys__Undefined___js_sys_10343e78df5acbe5___Function_fn_wasm_bindgen_d9b77c16455757f4___JsValue_____wasm_bindgen_d9b77c16455757f4___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
