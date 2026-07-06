<template>
  <view class="terminal">
    <view class="prompt">$ ssh login@arch-tutorial</view>
    <view class="prompt">Password:</view>
    <input v-model="username" placeholder="username" class="cmd-input" />
    <input v-model="password" type="password" placeholder="········" class="cmd-input" />
    <button @click="handleLogin" :disabled="loading || countdown > 0" class="cmd-btn">{{ countdown > 0 ? `[locked ${countdown}s]` : '$ login' }}</button>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <text v-if="countdown > 0" class="cmd-countdown">账户已锁定，{{ countdown }} 秒后可重试</text>
    <navigator url="/pages/register/register" class="cmd-link">$ register --new-account</navigator>
    <navigator url="/pages/forgot-password/forgot-password" class="cmd-link">$ passwd --forgot</navigator>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLogin } from '../../src/application/useLogin';

const username = ref('');
const password = ref('');
const { loading, error, countdown, login } = useLogin();

async function handleLogin() {
  try {
    await login(username.value, password.value);
    uni.navigateTo({ url: '/pages/index/index' });
  } catch {}
}
</script>

<style lang="scss" scoped>
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
.cmd-input {
  display: block;
  background: #fafafa;
  border: 2rpx solid #333;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
  font-family: 'Courier New', Courier, monospace;
  font-size: 30rpx;
  color: #1a1a1a;
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
.cmd-countdown {
  display: block;
  color: #999;
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
