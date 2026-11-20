/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (Platform.OS === 'android') {
  const fcm = require('@react-native-firebase/messaging');
  fcm.setBackgroundMessageHandler(fcm.getMessaging(), async () => {
    // Hệ thống Android tự hiển thị notification payload khi app chạy nền / đã đóng
  });
}

AppRegistry.registerComponent(appName, () => App);
