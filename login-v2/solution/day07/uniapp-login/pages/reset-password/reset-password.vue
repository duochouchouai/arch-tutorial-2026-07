<template>
  <view class="terminal">
    <view class="prompt">$ passwd --reset</view>
    <input v-model="token" placeholder="token" class="cmd-input" />
    <input v-model="newPassword" type="password" placeholder="new password" class="cmd-input" />
    <button @click="handleReset" :disabled="loading" class="cmd-btn">$ passwd --confirm</button>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <text v-if="done" class="cmd-ok">[OK] 密码已重置</text>
    <navigator url="/pages/login/login" class="cmd-link">$ ssh login@arch-tutorial</navigator>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '../../src/infrastructure/auth-api';

const token = ref('');
const newPassword = ref('');
const loading = ref(false);
const error = ref('');
const done = ref(false);

async function handleReset() {
  loading.value = true;
  error.value = '';
  try {
    await authApi.resetPassword(token.value, newPassword.value);
    done.value = true;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '重置失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.terminal { background: #fff; min-height: 100vh; padding: 60rpx 40rpx; font-family: 'Courier New', Courier, monospace; }
.prompt { color: #555; font-size: 28rpx; margin-bottom: 10rpx; }
.cmd-input { display: block; background: #fafafa; border: 2rpx solid #333; padding: 16rpx 24rpx; margin-bottom: 24rpx; font-family: 'Courier New', Courier, monospace; font-size: 30rpx; color: #1a1a1a; }
.cmd-btn { background: #fff; border: 2rpx solid #333; color: #1a1a1a; font-family: 'Courier New', Courier, monospace; font-size: 28rpx; margin-bottom: 32rpx; padding: 16rpx; }
.cmd-btn[disabled] { opacity: 0.4; }
.cmd-error { display: block; color: #c00; font-size: 26rpx; margin-bottom: 24rpx; }
.cmd-ok { display: block; color: #333; font-size: 26rpx; margin-bottom: 24rpx; }
.cmd-link { display: block; color: #555; font-size: 26rpx; text-decoration: none; margin-bottom: 12rpx; }
</style>
