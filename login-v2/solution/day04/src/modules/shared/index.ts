/**
 * @file shared 模块公开入口 — 纯 barrel
 * @author 教程组
 *
 * 跨模块只允许 import 这个文件（`modules/shared/index`）。
 *
 * 简化说明：本入口同时发布了端口类型与基础设施实现（errorHandler、以及 Day 05 起加入的 openDatabase 等）。
 * 真实仓库里 shared 按子域开了多个入口（@shared/ports、@shared/infrastructure），
 * 让 domain 层只触得到端口类型；教程为少一层心智负担只留一个出口。
 * 由于 domain 侧对 shared 的引用全部是 `import type`，运行时不会真的把实现拉进领域层。
 */
export { DomainEvent } from './domain/index'
export * from './domain/errors/index'
export type { EventBus, EventHandler, IdGenerator, TimeProvider } from './domain/ports/index'
export { CryptoIdGenerator, InMemoryEventBus, SystemTimeProvider, errorHandler } from './infrastructure/index'
export { EnvelopeSchema, fail, ok } from './schemas/index'
export type { Envelope } from './schemas/index'
