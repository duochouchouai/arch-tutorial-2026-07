<template>
  <view class="terminal">
    <view class="prompt">$ ssh login@arch-tutorial</view>
    <view class="prompt">Password:</view>
    <input v-model="username" placeholder="username" class="cmd-input" />
    <input v-model="password" type="password" placeholder="········" class="cmd-input" />
    <button @click="handleLogin" :disabled="loading" class="cmd-btn">$ login</button>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <navigator url="/pages/register/register" class="cmd-link">$ register --new-account</navigator>
    <navigator url="/pages/forgot-password/forgot-password" class="cmd-link">$ passwd --forgot</navigator>
  </view>
</template>

<script setup lang="ts">
/**
 * 登录页 — 只做三件事：收集输入、调 useLogin、按结果跳转。
 * 校验、请求、错误映射全在 useLogin / authApi 里，页面不 import uni.request。
 */
import { ref } from 'vue';
import { useLogin } from '../../src/application/useLogin';

const username = ref('');
const password = ref('');
const { loading, error, login } = useLogin();

async function handleLogin() {
  const ok = await login(username.value, password.value);
  if (ok) {
    uni.navigateTo({ url: '/pages/index/index' });
  }
}
</script>

<style lang="scss" scoped>
/* 终端风样式：每个页面重复声明一小块（教程不做公共样式抽取，与「页面只管展示」一致） */
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
