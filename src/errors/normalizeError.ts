import { isAxiosError } from "axios";
import { ApiError, type ApiMethodMeta  } from "./apiError";

export function normalizeError(raw: unknown, method?: any): ApiError {
  const meta = method?.meta as ApiMethodMeta | undefined;
  const defaultDisplay = meta?.errorDisplay ?? 'toast';

  if (isAxiosError(raw)) {
    const status = raw.response?.status;
    const data = raw.response?.data;

    // 网络错误/超时
    if (!raw.response) {
      return new ApiError({
        code: raw.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
        display: defaultDisplay,
      })
    }

    // 登录失效
    if (status === 401) {
      return new ApiError({
        code: data?.code ?? 'UNAUTHORIZED',
        httpStatus: 401,
        detail: data?.detail,
        display: 'silent',
      })
    }

    // 表单校验
    if (status === 422) {
      return new ApiError({
        code: data?.code ?? 'VALIDATION_ERROR',
        httpStatus: 422,
        detail: data?.detail,
        fields: data?.detail?.fields,
        display: meta?.errorDisplay ?? 'form',
      })
    }

    // 其他业务 / HTTP 错误
    return new ApiError({
      code: data?.code ?? `HTTP_${status}`,
      httpStatus: status,
      detail: data?.detail,
      display: defaultDisplay,
    })
  }

  if (raw instanceof ApiError) {
    return raw
  }

  return new ApiError({
    code: 'UNKNOWN_ERROR',
    display: defaultDisplay,
  })
}