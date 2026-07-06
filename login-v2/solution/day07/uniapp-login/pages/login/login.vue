<template>
  <view class="terminal">
    <view v-if="countdown > 0" class="lock-screen">
      <view class="prompt">$ ssh login@arch-tutorial</view>
      <view class="lock-text">ACCOUNT LOCKED</view>
      <view class="lock-countdown">{{ countdown }}</view>
      <view class="lock-label">seconds remaining</view>
      <view class="output"></view>
      <view class="output blink">$ █</view>
    </view>
    <view v-else>
      <view class="prompt">$ ssh login@arch-tutorial</view>
      <view class="prompt">Password:</view>
      <input v-model="username" placeholder="username" class="cmd-input" />
      <input v-model="password" type="password" placeholder="········" class="cmd-input" />
      <button @click="handleLogin" :disabled="loading" class="cmd-btn">$ login</button>
      <text v-if="error" class="cmd-error">{{ error }}</text>
      <navigator url="/pages/register/register" class="cmd-link">$ register --new-account</navigator>
      <navigator url="/pages/forgot-password/forgot-password" class="cmd-link">$ passwd --forgot</navigator>
      <navigator url="/pages/oauth/oauth" class="cmd-link">$ oauth --login</navigator>
    </view>
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
.lock-screen {
  text-align: center;
  margin-top: 120rpx;
}
.lock-text {
  font-family: 'Courier New', Courier, monospace;
  font-size: 32rpx;
  color: #d35400;
  letter-spacing: 6rpx;
  margin-bottom: 32rpx;
}
.lock-countdown {
  font-family: 'Courier New', Courier, monospace;
  font-size: 120rpx;
  font-weight: bold;
  color: #d35400;
  -webkit-text-stroke: 3rpx #d35400;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
}
.lock-label {
  font-family: 'Courier New', Courier, monospace;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 48rpx;
}
.cmd-link {
  display: block;
  color: #555;
  font-size: 26rpx;
  text-decoration: none;
  margin-bottom: 12rpx;
}
</style>
