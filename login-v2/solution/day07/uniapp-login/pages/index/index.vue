<template>
  <view class="terminal">
    <view class="output">$ ssh login@arch-tutorial</view>
    <view class="output">Authenticated.</view>
    <view class="output"></view>
    <view class="output">$ echo "恭喜你完成架构学习"</view>
    <view class="big-text">恭喜你完成架构学习</view>
    <view class="output">$ echo "祝你在梯度动力团队收获技术，收获成长！"</view>
    <view class="big-text">祝你在梯度动力团队收获技术，收获成长！</view>
    <view class="output"></view>
    <view class="output blink">$ █</view>
    <view class="output"></view>
    <view class="prompt">$ exit</view>
    <button @click="handleLogout" class="cmd-btn">$ logout</button>
  </view>
</template>

<script setup lang="ts">
function handleLogout() {
  uni.removeStorageSync('remember_token');
  uni.navigateTo({ url: '/pages/login/login' });
}
</script>

<style lang="scss" scoped>
.terminal {
  background: #ffffff;
  min-height: 100vh;
  padding: 60rpx 40rpx;
  font-family: 'Courier New', Courier, monospace;
}
.output {
  color: #555;
  font-size: 28rpx;
  margin-bottom: 8rpx;
}
.big-text {
  font-size: 32rpx;
  font-weight: normal;
  color: #1a1a1a;
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 4rpx;
  text-shadow: 2rpx 2rpx 0 #e0e0e0;
  margin: 16rpx 0 32rpx 0;
  line-height: 2;
}
.blink {
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
.prompt {
  color: #555;
  font-size: 28rpx;
  margin-top: 32rpx;
}
.cmd-btn {
  background: #ffffff;
  border: 2rpx solid #333;
  color: #1a1a1a;
  font-family: 'Courier New', Courier, monospace;
  font-size: 28rpx;
  margin-top: 16rpx;
  padding: 16rpx;
}
</style>
