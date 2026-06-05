import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'pages/login.html'),
        dashboard: resolve(__dirname, 'pages/dashboard.html'),
        adminDashboard: resolve(__dirname, 'pages/admin-dashboard.html'),
        members: resolve(__dirname, 'pages/members.html'),
        videos: resolve(__dirname, 'pages/videos.html'),
        guestDashboard: resolve(__dirname, 'pages/guest-dashboard.html'),
      }
    }
  }
});
