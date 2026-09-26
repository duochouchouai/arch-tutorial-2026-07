/**
 * @file SQLite 连接工厂 — 跨模块共享的基础设施
 * @author 教程组
 *
 * 连接本身是共享的（一个进程一个文件一个连接），但**表不是**：
 * 每张表的 DDL 只出现在拥有者模块的 infrastructure 里（见架构守卫测试第 3 条）。
 *
 * 使用 Node 内置的 node:sqlite（Node 24+ 无需 flag；Node 22.5+ 需 --experimental-sqlite）。
 */
import { DatabaseSync } from 'node:sqlite'

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  return db
}
