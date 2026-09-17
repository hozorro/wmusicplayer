/**
 * 配置初始化服务：统一注入所有模块配置
 * 应用启动时调用一次，确保各模块配置就绪
 */
import { getConfig } from '@/config/config-provider'
import { setSyncConfig } from './lib-sync'
import { setIdbTracksConfig } from '@/idb/sw-api/endpoints/tracks'
import { setIdbArtistsConfig } from '@/idb/sw-api/endpoints/artists'

/**
 * 初始化所有模块配置
 * 在 main.ts 中 app.use(pinia) 之后、initPlayer 之前调用
 */
export function initConfig(): void {
  const config = getConfig()
  setSyncConfig(config)
  setIdbTracksConfig(config)
  setIdbArtistsConfig(config)
}
