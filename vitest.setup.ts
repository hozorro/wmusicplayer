// Node 26 把 localStorage 作为实验性 getter 挂在 globalThis 上，只要被
// `typeof localStorage` 或属性读取碰到就打印 ExperimentalWarning。
// 单测环境不需要浏览器存储，显式声明为 undefined（与 getter 的返回值等价），
// 既消除噪声，也保持各模块原有的非浏览器分支不变。
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: undefined,
})

// 动态 import 保证上面的定义先于 i18n 模块顶层对 localStorage 的探测。
// 应用入口会调用 loadLocaleMessages() 懒加载语言包，单测不走入口；
// 若不预载，createI18n({ messages: {} }) 在 t() 时会输出
// [intlify] Not found 'player.*' key ... 警告（fallback 链走到末尾的 'zh'）。
const { default: i18n } = await import('./src/i18n')
const { default: zhCN } = await import('./src/i18n/langs/zh-CN.json')
i18n.global.setLocaleMessage('zh-CN', zhCN)
