<template>
  <view>
    <input v-model="username" placeholder="用户名" />
    <input v-model="password" type="password" placeholder="密码" />
    <button @click="handleLogin" :disabled="loading">登录</button>
    <text v-if="error" style="color:red">{{ error }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLogin } from '../application/useLogin';

const username = ref('');
const password = ref('');
const { loading, error, user, login } = useLogin();

async function handleLogin() {
  try {
    await login(username.value, password.value);
    uni.navigateTo({ url: '/pages/index' });
  } catch {}
}
</script>

<style lang="scss" scoped>
input {
  border: 1px solid #ddd;
  padding: 20rpx;
  margin: 20rpx;
  border-radius: 8rpx;
}
button {
  margin: 20rpx;
  background-color: #007aff;
  color: #fff;
}
</style>
