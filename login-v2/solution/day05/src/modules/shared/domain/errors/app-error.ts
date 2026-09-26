/**
 * @file 应用错误基类 — 所有「可预期错误」的共同父类
 * @author 教程组
 *
 * 设计要点：
 * - 错误首先是**领域概念**，不是 HTTP 概念。AppError 只带业务语义的 code 与建议状态码，
 *   真正决定响应形态的是表现层的 error-handler（那才是 HTTP 适配器所在）。
 * - 预期内的错误（校验失败、冲突、未授权）一律继承 AppError；
 *   预期外的错误（代码 bug、连接断开）**不要包装**，让 error-handler 兜底成 500。
 *   把未知错误也包装成 AppError，等于把「程序有 bug」伪装成「用户输入不对」。
 */

/** 字段级错误：字段名 → 该字段的全部错误信息（给前端逐字段展示用） */
export type FieldErrors = Readonly<Record<string, readonly string[]>>

export interface AppErrorOptions {
  /** 稳定错误码（前端按码分支，不按文案） */
  code: string
  /** 建议 HTTP 状态码（由表现层采纳，不是强制） */
  statusCode: number
  fieldErrors?: FieldErrors | undefined
}

export class AppError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly fieldErrors: FieldErrors | undefined

  constructor(message: string, options: AppErrorOptions) {
    super(message)
    // Error 子类的 name 默认是 'Error'，这里改成真实类名（日志里一眼看出错误类型）
    this.name = new.target.name
    this.code = options.code
    this.statusCode = options.statusCode
    this.fieldErrors = options.fieldErrors
  }
}
