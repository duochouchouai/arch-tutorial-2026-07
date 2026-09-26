/**
 * @file 批量执行器 — 对每个 solution 目录跑 npm install / npm run gate / npm test
 * @author 教程组
 *
 * 为什么用脚本而不是 shell 循环：CI（ubuntu/macos/windows）都能跑，
 * 且能把失败目录收集起来最后统一报告（一个目录红不该掩盖其他目录的结果）。
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const targets = [
  'solution/day01',
  'solution/day02',
  'solution/day03',
  'solution/day04',
  'solution/day05',
  'solution/day06',
  'solution/day07/backend',
  'solution/day07/uniapp-login',
]

const mode = process.argv[2] ?? 'gate'
const commands = {
  // npm ci 需要 package-lock.json；缺 lock（首次手打）时退回 npm install
  install: (dir) => (existsSync(join(dir, 'package-lock.json')) ? 'npm ci' : 'npm install'),
  gate: () => 'npm run gate',
  test: () => 'npm test',
}

const failures = []
for (const target of targets) {
  const dir = join(root, target)
  const command = commands[mode](dir)
  console.log(`\n──────── ${target}: ${command} ────────`)
  const result = spawnSync(command, { cwd: dir, stdio: 'inherit', shell: true })
  if (result.status !== 0) {
    failures.push(target)
  }
}

if (failures.length > 0) {
  console.error(`\n✗ 失败目录：${failures.join(', ')}`)
  process.exit(1)
}
console.log('\n✓ 全部通过')
