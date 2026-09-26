/**
 * @file 测试替身（fakes）— 目前只有「假时钟」
 * @author 教程组
 *
 * 实体永远不调 Date.now()：时间从构造时注入的 TimeProvider 取。
 * 于是测试里换个假时钟就能表达「30 分钟后」——一行代码，不用等。
 * 后续几天（端口 → 用例）这里会再加入假仓储、假邮件等替身。
 */
import type { TimeProvider } from '../../src/modules/shared/index'

export class FakeTimeProvider implements TimeProvider {
  #nowMs: number

  constructor(startMs = 1_700_000_000_000) {
    this.#nowMs = startMs
  }

  now(): number {
    return this.#nowMs
  }

  /** 时间旅行：把「30 分钟后解锁」变成一行测试代码 */
  advance(ms: number): void {
    this.#nowMs += ms
  }
}
