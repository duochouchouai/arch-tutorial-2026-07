<template>
  <view class="page">
    <text class="title">注册</text>

    <input v-model="username" class="input" placeholder="请输入用户名" />
    <input v-model="email" class="input" placeholder="请输入邮箱" />
    <input v-model="password" class="input" placeholder="请输入密码" password />

    <button class="button" @tap="handleRegister">注册</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../../src/application/use-auth';

const username = ref('');
const email = ref('');
const password = ref('');

const { register } = useAuth();

async function handleRegister() {
  const ok = await register({
    username: username.value,
    email: email.value,
    password: password.value,
  });

  if (ok) {
    uni.navigateTo({
      url: '/pages/login/login',
    });
  }
}
</script>

<style scoped>
.page {
  padding: 40rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
}

.input {
  border: 1px solid #ddd;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.button {
  margin-top: 20rpx;
}
</style>
