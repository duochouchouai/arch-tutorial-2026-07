<template>
  <view class="terminal">
    <view class="prompt">$ passwd --reset</view>
    <input v-model="email" placeholder="email" class="cmd-input" />
    <input v-model="code" placeholder="code (6 digits)" class="cmd-input" />
    <input v-model="password" type="password" placeholder="new password" class="cmd-input" />
    <button @click="handleReset" :disabled="loading" class="cmd-btn">$ passwd --confirm</button>
    <text v-if="done" class="cmd-ok">[OK] 密码已重置，旧会话已失效，请重新登录</text>
    <text v-if="error" class="cmd-error">{{ error }}</text>
    <navigator url="/pages/login/login" class="cmd-link">$ ssh login@arch-tutorial</navigator>
  </view>
</template>

<script setup lang="ts">
/**
 * 重置密码页 — 邮箱 + 验证码 + 新密码。
 *
 * 说明：真实项目里邮箱可由上一个页面经路由参数带过来
 * （uni-app 的 onLoad(query)），教程为了不引入 @dcloudio/uni-app 依赖，
 * 让用户再填一次邮箱 —— 页面职责不变，只是少一份「传参」的便利。
 */
import { ref } from 'vue';
import { useResetPassword } from '../../src/application/useResetPassword';

const email = ref('');
const code = ref('');
const password = ref('');
const { loading, error, done, resetPassword } = useResetPassword();

async function handleReset() {
  await resetPassword(email.value, code.value, password.value);
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
