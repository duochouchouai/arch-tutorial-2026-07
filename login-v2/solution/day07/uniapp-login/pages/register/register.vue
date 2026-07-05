<template>
  <view class="terminal">
    <view class="prompt">$ useradd --create</view>
    <input v-model="username" placeholder="username" class="cmd-input" />
    <input v-model="password" type="password" placeholder="password" class="cmd-input" />
    <input v-model="email" placeholder="email (optional)" class="cmd-input" />
    <button @click="handleRegister" :disabled="loading" class="cmd-btn">$ useradd --confirm</button>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <navigator url="/pages/login/login" class="cmd-link">$ ssh login@arch-tutorial</navigator>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRegister } from '../../src/application/useRegister';

const username = ref('');
const password = ref('');
const email = ref('');
const { loading, error, register } = useRegister();

async function handleRegister() {
  try {
    await register(username.value, password.value, email.value);
    uni.navigateTo({ url: '/pages/login/login' });
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
.cmd-link {
  display: block;
  color: #555;
  font-size: 26rpx;
  text-decoration: none;
  margin-bottom: 12rpx;
}
</style>
