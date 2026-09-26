<template>
  <view class="terminal">
    <view class="prompt">$ passwd --forgot</view>
    <input v-model="email" placeholder="email" class="cmd-input" />
    <button @click="handleForgot" :disabled="loading" class="cmd-btn">$ send-reset-code</button>
    <text v-if="sent" class="cmd-ok">[OK] 若该邮箱已注册，验证码已发送（未注册也返回成功：不透露账号存在性）</text>
    <navigator v-if="sent" url="/pages/reset-password/reset-password" class="cmd-link">
      $ passwd --reset
    </navigator>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <navigator url="/pages/login/login" class="cmd-link">$ ssh login@arch-tutorial</navigator>
  </view>
</template>

<script setup lang="ts">
/**
 * 忘记密码页 — 发一枚 6 位重置码到邮箱，然后去重置页填码 + 新密码。
 * 「未注册邮箱也提示同样文案」是刻意的：前端不配合后端泄露账号存在性。
 */
import { ref } from 'vue';
import { useForgotPassword } from '../../src/application/useForgotPassword';

const email = ref('');
const { loading, error, sent, forgotPassword } = useForgotPassword();

async function handleForgot() {
  await forgotPassword(email.value);
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
