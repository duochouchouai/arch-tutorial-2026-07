<template>
  <view class="terminal">
    <view class="prompt">$ whoami</view>
    <view class="big-text">Congrats! Architecture Complete.<br/>Welcome to the team.</view>
    <view class="cmd-ok" v-if="checking">[..] 正在验证会话</view>
    <view class="cmd-ok" v-else-if="userId">[OK] userId = {{ userId }}</view>
    <view class="cmd-error" v-else>[!!] 未登录或会话已失效</view>
    <button @click="handleCheck" :disabled="checking" class="cmd-btn">$ session --verify</button>
    <button @click="handleLogout" :disabled="!userId" class="cmd-btn">$ logout</button>
    <navigator url="/pages/login/login" class="cmd-link">$ ssh login@arch-tutorial</navigator>
  </view>
</template>

<script setup lang="ts">
/**
 * 首页 — 展示当前会话状态，提供「验证会话 / 退出」两个动作。
 *
 * 会话验证 = 拿本地 token 调 GET /auth/session：token 是否有效由服务端说了算，
 * 本地缓存只是「上次登录过」的线索，不是「已登录」的证明。
 *
 * 说明：setup 里直接 await check()；真实项目用 uni-app 的 onShow 生命周期
 * （需 @dcloudio/uni-app 依赖）让每次进页面都刷新一次。
 */
import { ref } from 'vue';
import { useSession } from '../../src/application/useSession';

const { checking, userId, check, logout } = useSession();

async function handleCheck() {
  await check();
  if (userId.value === null) {
    uni.redirectTo({ url: '/pages/login/login' });
  }
}

async function handleLogout() {
  await logout();
  uni.redirectTo({ url: '/pages/login/login' });
}

void handleCheck();
</script>

<style lang="scss" scoped>
/* 终端风样式：每个页面重复声明一小块（教程不做公共样式抽取，与「页面只管展示」一致） */
.big-text {
  font-size: 34rpx;
  color: #1a1a1a;
  margin: 24rpx 0;
  line-height: 1.8;
}
.terminal {
  background: #ffffff;
  min-height: 100vh;
  padding: 60rpx 40rpx;
  font-family: 'Courier New', Courier, monospace;
}
.prompt {
  color: #555;
  font-size: 28rpx;
  margin-bottom: 10rpx;
}
.cmd-btn {
  background: #ffffff;
  border: 2rpx solid #333;
  color: #1a1a1a;
  font-family: 'Courier New', Courier, monospace;
  font-size: 28rpx;
  margin-bottom: 32rpx;
  padding: 16rpx;
}
.cmd-btn[disabled] {
  opacity: 0.4;
}
.cmd-error {
  display: block;
  color: #cc0000;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}
.cmd-ok {
  display: block;
  color: #333;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}
.cmd-link {
  display: block;
  color: #555;
  font-size: 26rpx;
  text-decoration: none;
  margin-bottom: 12rpx;
}
</style>
