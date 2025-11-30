import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/editor/:id?',
      name: 'editor',
      component: () => import('../views/Editor.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/History.vue')
    }
  ]
})

export default router
