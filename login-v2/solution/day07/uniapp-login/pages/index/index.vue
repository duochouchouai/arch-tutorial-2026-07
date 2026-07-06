<template>
  <view class="terminal">
    <view class="output">$ ssh login@arch-tutorial</view>
    <view class="output">Authenticated.</view>
    <view class="output"></view>
    <view class="big-text">恭喜你完成架构学习<br/>祝你在梯度动力团队收获技术，收获成长！</view>
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
  font-size: 36rpx;
  font-weight: bold;
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 4rpx;
  text-align: center;
  margin: 40rpx 0;
  line-height: 2;
  -webkit-text-stroke: 2rpx #e67e22;
  -webkit-text-fill-color: transparent;
  text-shadow:
    1rpx 1rpx 0 #f0c78e,
    2rpx 2rpx 0 #f0c78e,
    3rpx 3rpx 0 #f0c78e,
    4rpx 4rpx 0 #f0c78e,
    5rpx 5rpx 0 #f0c78e,
    6rpx 6rpx 0 #f0c78e,
    7rpx 7rpx 0 #f0c78e,
    8rpx 8rpx 0 #f0c78e,
    9rpx 9rpx 0 #f0c78e,
    10rpx 10rpx 0 #f0c78e,
    11rpx 11rpx 0 #f0c78e,
    12rpx 12rpx 0 #f0c78e,
    13rpx 13rpx 0 #f0c78e,
    14rpx 14rpx 0 #f0c78e,
    15rpx 15rpx 0 #f0c78e,
    16rpx 16rpx 0 #f0c78e,
    17rpx 17rpx 0 #f0c78e,
    18rpx 18rpx 0 #f0c78e,
    19rpx 19rpx 0 #f0c78e,
    20rpx 20rpx 0 #f0c78e;
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
