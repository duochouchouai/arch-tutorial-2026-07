/**
 * @file 注册事件发布端口
 * @author 教程组
 *
 * 注册用例不直接摸 EventBus：它只声明「要发一个注册事件」。
 * 怎么发、发给谁、失败怎么办，都在实现（application/user-registered.publisher.ts）里收口。
 */
import type { PublicUser } from '../schemas/index'
export interface UserRegisteredPublisherPort {
  /**
   * 发布注册事件；失败只记日志，**绝不抛**（注册不能被副作用拖垮）。
   * 载荷带 username / email：订阅方（notifications）不必回查 users 模块
   * ——「事件载荷要装够订阅方需要的数据」是事件契约的一部分。
   */
  publish(user: PublicUser): Promise<void>
}
