module.exports = {
  dependencies: {
    '@react-native-firebase/app': {
      platforms: {
        ios: null, // Tắt autolink trên iOS (chỉ dùng FCM trên Android)
      },
    },
    '@react-native-firebase/messaging': {
      platforms: {
        ios: null,
      },
    },
  },
};
