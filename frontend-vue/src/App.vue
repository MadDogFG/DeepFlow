<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, onUnmounted } from 'vue';

// Heartbeat mechanism to keep the backend alive
let heartbeatInterval: number | null = null;

const sendHeartbeat = async () => {
  try {
    // Assuming backend is on port 5031 (http) or 7173 (https)
    // We should use the configured base URL or relative path if proxied
    // For dev environment, we hardcode or use env var
    await fetch('http://localhost:5031/api/system/heartbeat', { 
      method: 'POST',
      mode: 'no-cors' // We don't care about the response, just sending the ping
    });
  } catch (e) {
    // Ignore errors (backend might be starting up or down)
  }
};

onMounted(() => {
  sendHeartbeat(); // Initial ping
  heartbeatInterval = setInterval(sendHeartbeat, 2000); // Ping every 2s
});

onUnmounted(() => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
});
</script>

<template>
  <RouterView />
</template>

