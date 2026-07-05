<template>
  <view>
    <input v-model="email" placeholder="请输入注册邮箱" />
    <button @click="handleForgot" :disabled="loading">发送重置链接</button>
    <text v-if="sent" style="color:green">重置链接已发送</text>
    <text v-if="error" style="color:red">{{ error }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useForgotPassword } from '../application/useForgotPassword';

const email = ref('');
const { loading, error, sent, forgotPassword } = useForgotPassword();

async function handleForgot() {
  try {
    await forgotPassword(email.value);
  } catch {}
}
</script>
