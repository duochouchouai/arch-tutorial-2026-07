<template>
  <view class="page">
    <text class="title">忘记密码</text>

    <input v-model="email" class="input" placeholder="请输入邮箱" />

    <button class="button" @tap="handleForgotPassword">发送重置链接</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../../src/application/use-auth';

const email = ref('');

const { forgotPassword } = useAuth();

async function handleForgotPassword() {
  await forgotPassword({
    email: email.value,
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

.button {
  margin-top: 20rpx;
}
</style>
