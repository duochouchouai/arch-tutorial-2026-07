<template>
  <view class="terminal">
    <view class="prompt">$ oauth --login</view>
    <button @click="handleOAuth('wechat')" class="cmd-btn">$ oauth wechat</button>
    <button @click="handleOAuth('qq')" class="cmd-btn">$ oauth qq</button>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <navigator url="/pages/login/login" class="cmd-link">$ ssh login@arch-tutorial</navigator>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '../../src/infrastructure/auth-api';

const error = ref('');

async function handleOAuth(provider: string) {
  try {
    await authApi.oauthLogin(provider, 'demo-code');
    uni.navigateTo({ url: '/pages/index/index' });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'OAuth 登录失败';
  }
}
</script>

<style lang="scss" scoped>
.terminal { background: #fff; min-height: 100vh; padding: 60rpx 40rpx; font-family: 'Courier New', Courier, monospace; }
.prompt { color: #555; font-size: 28rpx; margin-bottom: 24rpx; }
.cmd-btn { display: block; width: 100%; background: #fff; border: 2rpx solid #333; color: #1a1a1a; font-family: 'Courier New', Courier, monospace; font-size: 28rpx; margin-bottom: 16rpx; padding: 16rpx; }
.cmd-error { display: block; color: #c00; font-size: 26rpx; margin-bottom: 24rpx; }
.cmd-link { display: block; color: #555; font-size: 26rpx; text-decoration: none; margin-top: 24rpx; }
</style>
