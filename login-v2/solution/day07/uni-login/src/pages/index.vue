<template>
  <view>
    <text class="congrats">恭喜完成架构学习，祝你在今后的开发中顺利！</text>
    <button @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
function handleLogout() {
  uni.removeStorageSync('remember_token');
  uni.navigateTo({ url: '/pages/login' });
}
</script>

<style>
.congrats {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff6600;
  text-align: center;
  margin-top: 200rpx;
  display: block;
}
</style>
