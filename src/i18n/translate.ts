import type { ApiError, FieldErrorItem } from "@/errors/apiError";
import i18n from ".";

export function getErrorI18nKey(error: ApiError): string {
  if (typeof error.code === 'number') {
    return `errors.biz.${error.code}`
  }
  return `errors.${error.code}`
}

export function translateApiError(error: ApiError): string {
  const key = getErrorI18nKey(error)

  if (i18n.global.te(key)) {
    return i18n.global.t(key, error.detail ?? {})
  }

  if (error.httpStatus) {
    const httpKey = `errors.HTTP_${error.httpStatus}`

    if (i18n.global.te(httpKey)) {
      return i18n.global.t(httpKey)
    }
  }
  return i18n.global.t('errors.UNKNOWN_ERROR')
}

export function translateFieldErrors(fields: Record<string, FieldErrorItem[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  for (const [field, errors] of Object.entries(fields)) {
    result[field] = errors.map(item => {
      const key = `validation.${item.type}`

      if (i18n.global.te(key)) {
        return i18n.global.t(key)
      }
      return i18n.global.t('validation.invalid')
    })
  }
  
  return result
}