<template>
  <view class="terminal">
    <view class="prompt">$ useradd --create</view>
    <input v-model="email" placeholder="email" class="cmd-input" />
    <button @click="handleSendCode" :disabled="sending" class="cmd-btn">$ send-code --email</button>
    <text v-if="codeSent" class="cmd-ok">[OK] 验证码已发送（若收不到请检查邮箱；开发环境见服务端控制台）</text>
    <input v-model="code" placeholder="code (6 digits)" class="cmd-input" />
    <input v-model="username" placeholder="username" class="cmd-input" />
    <input v-model="password" type="password" placeholder="password" class="cmd-input" />
    <button @click="handleRegister" :disabled="loading || !codeSent" class="cmd-btn">$ useradd --confirm</button>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <navigator url="/pages/login/login" class="cmd-link">$ ssh login@arch-tutorial</navigator>
  </view>
</template>

<script setup lang="ts">
/**
 * 注册页 — 两步流程（v2 起注册要验证码）：
 *   1) 填邮箱 → 发送验证码；
 *   2) 填验证码 + 用户名 + 密码 → 注册。
 * 两步的状态都在 useRegister 里，页面只做展示与转发。
 */
import { ref } from 'vue';
import { useRegister } from '../../src/application/useRegister';

const email = ref('');
const code = ref('');
const username = ref('');
const password = ref('');
const { loading, sending, error, codeSent, sendCode, register } = useRegister();

async function handleSendCode() {
  await sendCode(email.value);
}

async function handleRegister() {
  const ok = await register(username.value, password.value, email.value, code.value);
  if (ok) {
    uni.navigateTo({ url: '/pages/login/login' });
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
