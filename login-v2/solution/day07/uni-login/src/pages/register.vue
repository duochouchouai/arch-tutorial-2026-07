<template>
  <view>
    <input v-model="username" placeholder="用户名" />
    <input v-model="password" type="password" placeholder="密码" />
    <input v-model="email" placeholder="邮箱（选填）" />
    <button @click="handleRegister" :disabled="loading">注册</button>
    <text v-if="error" style="color:red">{{ error }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRegister } from '../application/useRegister';

const username = ref('');
const password = ref('');
const email = ref('');
const { loading, error, register } = useRegister();

async function handleRegister() {
  try {
    await register(username.value, password.value, email.value);
    uni.navigateTo({ url: '/pages/login' });
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
