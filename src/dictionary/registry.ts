/**
 * @file registry.ts
 * @description 默认引擎注册表，供 element 加载词典后注册、getCandidates 等 API 使用。
 */
import type { PinyinEngine } from "../engine/pinyin-engine";

let _defaultEngine: PinyinEngine | null = null;

/**
 * 注册默认引擎（element 加载词典后调用）。
 */
export function registerDefaultEngine(engine: PinyinEngine): void {
  _defaultEngine = engine;
}

/**
 * 获取已注册的默认引擎；未注册时返回 null。
 */
export function getDefaultEngine(): PinyinEngine | null {
  return _defaultEngine;
}
