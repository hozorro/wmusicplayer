/**
 * 配置提供者：单例 + 可注入
 * 底层模块通过参数接收配置，保持纯净可测
 * 应用层（store/facade）负责组装和持久化
 */
import { DEFAULT_CONFIG, type PlayerConfig } from './player-config'

/** 配置变更监听器 */
type ConfigListener = (config: PlayerConfig) => void

let currentConfig: PlayerConfig = { ...DEFAULT_CONFIG }
const listeners = new Set<ConfigListener>()

/** 获取当前配置（只读副本） */
export function getConfig(): Readonly<PlayerConfig> {
  return currentConfig
}

/** 获取配置快照（用于测试） */
export function getConfigSnapshot(): PlayerConfig {
  return { ...currentConfig }
}

/** 更新配置（应用层调用） */
export function updateConfig(updates: Partial<PlayerConfig>): void {
  currentConfig = { ...currentConfig, ...updates }
  listeners.forEach(fn => fn(currentConfig))
}

/** 重置为默认配置 */
export function resetConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG }
  listeners.forEach(fn => fn(currentConfig))
}

/** 订阅配置变更 */
export function onConfigChange(fn: ConfigListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 测试辅助：直接设置配置（不触发监听） */
export function __setConfigForTest(config: PlayerConfig): void {
  currentConfig = config
}
