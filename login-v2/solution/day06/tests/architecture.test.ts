/**
 * @file 架构守卫测试 — 把架构纪律变成会失败的测试
 * @author 教程组
 *
 * 三条纪律（与 docs/conventions.md、GUIDE-day06 对拍）：
 * 1. 跨模块 import 只能命中对方 index.ts —— 模块出口收敛，内部件不出模块；
 * 2. domain/ 不得依赖 application / infrastructure / presentation，
 *    也不得 import npm 包（zod 仅豁免 domain/schemas/ 与 domain/validators/）；
 * 3. users 表的建表与写语句只允许出现在 users/infrastructure/ —— 表归属。
 *
 * 说明：这是文本级启发式守卫（读源码、解析 import 语句做路径归一）。
 * 真实仓库的同款守卫可升级为 AST 级；思路一致 —— 规则要被机器执行，而不是写在文档里。
 *
 * 测试文件（*.test.ts）与 tests/ 目录不在守卫范围内。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = path.resolve(__dirname, '../src')
const MODULES_DIR = path.join(SRC_DIR, 'modules')

function listTsFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...listTsFiles(full))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full)
    }
  }
  return files
}

/** 提取 `from 'x'` / `import 'x'` 的模块路径 */
function importSpecifiers(source: string): string[] {
  const specs: string[] = []
  for (const match of source.matchAll(/(?:from|import)\s+'([^']+)'/g)) {
    const spec = match[1]
    if (spec !== undefined) {
      specs.push(spec)
    }
  }
  return specs
}

/** 文件属于哪个模块（src/modules/<name>/...）；不在模块内返回 null */
function moduleNameOf(file: string): string | null {
  const rel = path.relative(MODULES_DIR, file)
  if (rel.startsWith('..')) {
    return null
  }
  return rel.split(path.sep)[0] ?? null
}

const rel = (file: string): string => path.relative(process.cwd(), file)

const files = listTsFiles(MODULES_DIR)

describe('架构守卫', () => {
  it('守卫自身有效性：确实扫到了模块源码（防止 glob 坏了导致空跑）', () => {
    expect(files.length).toBeGreaterThan(30)
  })

  it('第 1 条：跨模块 import 只能命中对方 index.ts', () => {
    const violations: string[] = []
    for (const file of files) {
      const own = moduleNameOf(file)
      for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
        if (!spec.startsWith('.')) {
          continue
        }
        const resolved = path.resolve(path.dirname(file), spec)
        if (resolved.startsWith(SRC_DIR + path.sep) && !resolved.startsWith(MODULES_DIR + path.sep)) {
          violations.push(`${rel(file)} → ${spec}（模块不得依赖 src 根部文件）`)
          continue
        }
        const target = moduleNameOf(resolved)
        if (target === null || target === own) {
          continue
        }
        const allowed = path.join(MODULES_DIR, target, 'index')
        if (resolved !== allowed) {
          violations.push(`${rel(file)} → ${spec}（跨模块只允许命中 ${target}/index）`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('第 2 条：domain 层不依赖外层，不 import npm（zod 限 schemas/validators）', () => {
    const violations: string[] = []
    for (const file of files) {
      if (!file.split(path.sep).includes('domain')) {
        continue
      }
      const normalized = file.split(path.sep).join('/')
      for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
        if (!spec.startsWith('.')) {
          // zod 豁免：形状真理源（schemas/）、业务规则（validators/）、事件 payload（events/）
          const zodAllowed =
            spec === 'zod' &&
            (normalized.includes('/domain/schemas/') ||
              normalized.includes('/domain/validators/') ||
              normalized.includes('/domain/events/'))
          if (!zodAllowed) {
            violations.push(`${rel(file)} → ${spec}（domain 只允许 zod 且限 schemas/validators/events）`)
          }
          continue
        }
        const resolved = path.resolve(path.dirname(file), spec)
        const own = moduleNameOf(file)
        const target = moduleNameOf(resolved)
        if (target !== null && target !== own) {
          continue // 跨模块引用交给第 1 条校验（且必须 import type）
        }
        const parts = path.relative(MODULES_DIR, resolved).split(path.sep)
        const layer = parts[1]
        if (layer !== undefined && layer !== 'domain') {
          violations.push(`${rel(file)} → ${spec}（domain 不得依赖 ${layer} 层）`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('第 3 条：users 表的建表与写语句只出现在 users/infrastructure/', () => {
    const writePattern = /(INSERT\s+INTO\s+users|UPDATE\s+users\b|CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+users\b)/i
    const violations: string[] = []
    for (const file of listTsFiles(SRC_DIR)) {
      if (writePattern.test(readFileSync(file, 'utf8'))) {
        if (!file.includes(path.join('modules', 'users', 'infrastructure'))) {
          violations.push(rel(file))
        }
      }
    }
    expect(violations).toEqual([])
  })
})
