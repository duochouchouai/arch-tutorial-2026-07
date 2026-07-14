import { UserRepository } from '../domain/user-repository';
import { ValidationError } from '../shared/errors';

const PROVIDERS = ['wechat', 'qq'] as const;
export type OAuthProvider = typeof PROVIDERS[number];

export interface OAuthLoginInput {
  provider: OAuthProvider;
  code: string;
}

/**
 * 第三方登录用例
 *
 * 对比 v1：
 *   - ❌ 两个路由复制粘贴 → ✅ 一个 use case，provider 参数化
 *   - ❌ AppSecret 硬编码在代码里 → ✅ provider 标识简化（模拟场景）
 *   - ❌ 用户名自动生成规则散落 → ✅ 统一在用例里生成
 */
export class OAuthLoginUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: OAuthLoginInput) {
    if (!PROVIDERS.includes(input.provider)) {
      throw new ValidationError(`不支持的登录方式：${input.provider}（支持 wechat / qq）`);
    }

    // 模拟用 code 换取 openid
    const openid = `${input.provider}_${input.code}`;

    // 查找是否已有绑定
    let user = await this.userRepository.findByOAuth(input.provider, openid);

    if (!user) {
      // 首次登录，自动创建用户
      user = await this.userRepository.createOAuthUser({
        username: `${input.provider}_${openid.slice(-8)}`,
        email: '',
        oauthProvider: input.provider,
        oauthId: openid,
      });
    }

    return user;
  }
}
