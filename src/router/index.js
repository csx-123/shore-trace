import { createRouter, createWebHistory } from 'vue-router'
import RecordView from '../views/RecordView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/record' },
    { path: '/record', component: RecordView },
    { path: '/:pathMatch(.*)*', redirect: '/record' },
  ],
})

export default router
