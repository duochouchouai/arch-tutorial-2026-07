<template>
  <view class="page">
    <text class="title">登录</text>

    <input v-model="username" class="input" placeholder="请输入用户名" />
    <input v-model="password" class="input" placeholder="请输入密码" password />

    <label class="row">
      <checkbox :checked="rememberMe" @tap="rememberMe = !rememberMe" />
      <text>记住我</text>
    </label>

    <button class="button" @tap="handleLogin">登录</button>

    <text class="link" @tap="goRegister">没有账号？去注册</text>
    <text class="link" @tap="goForgot">忘记密码</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../../src/application/use-auth';

const username = ref('');
const password = ref('');
const rememberMe = ref(false);

const { login } = useAuth();

async function handleLogin() {
  await login({
    username: username.value,
    password: password.value,
    rememberMe: rememberMe.value,
  });
}

function goRegister() {
  uni.navigateTo({
    url: '/pages/register/register',
  });
}

function goForgot() {
  uni.navigateTo({
    url: '/pages/forgot-password/forgot-password',
  });
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

.row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.button {
  margin-top: 20rpx;
}

.link {
  display: block;
  margin-top: 24rpx;
  color: #007aff;
}
</style>
