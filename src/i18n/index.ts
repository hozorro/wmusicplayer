import { createI18n, type I18nOptions } from "vue-i18n";

const DEFAULT_LOCALE: SupportedLocale = 'zh-CN';
const options: I18nOptions = {
  legacy: false,
  locale: localStorage.getItem('locale') || DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {}
}

const i18n = createI18n<false, typeof options>(options);

export const langsMap: {label: string, value: SupportedLocale}[] = [
  {label: '简体中文', value: 'zh-CN'},
  {label: 'English', value: 'en-US'},
  {label: '日本語', value: 'ja-JP'},
  {label: '한국어', value: 'ko-KR'},
]

export async function loadLocaleMessages(locale: SupportedLocale) {
  if (i18n.global.availableLocales.includes(locale)) {
    i18n.global.locale.value = locale;
    return;
  }
  const messages = await import(`./langs/${locale}.json`)
  i18n.global.setLocaleMessage(locale, messages.default);
  i18n.global.locale.value = locale;
}

export default i18n;