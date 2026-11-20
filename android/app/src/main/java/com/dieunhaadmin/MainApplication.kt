package com.dieunhaadmin

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createOrderNotificationChannel()
    loadReactNative(this)
  }

  private fun createOrderNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      val audioAttrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

      val channel = NotificationChannel(
        "orders_high",
        "Đơn hàng mới (Ưu tiên cao)",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Thông báo bật nổi (heads-up) ngay lập tức khi có đơn hàng mới"
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 200, 120, 200)
        setSound(soundUri, audioAttrs)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }
  }
}
