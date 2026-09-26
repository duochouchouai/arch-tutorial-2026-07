/**
 * @file 领域事件基类
 * @author 教程组
 *
 * 所有领域事件都继承它。事件总线按 `event.constructor.name` 路由，
 * 所以每个事件类都要有自己的类名，不要匿名子类。
 *
 * `occurredAt` 不从环境读取（不调 Date.now()），由发布方从 TimeProvider 取好传入：
 * 事件的时间也是「外部输入」，必须可注入、可断言。
 */
export abstract class DomainEvent {
  /** 事件发生时间（Unix 毫秒） */
  readonly occurredAt: number

  constructor(occurredAt: number) {
    this.occurredAt = occurredAt
  }
}
