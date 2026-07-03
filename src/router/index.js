import { createRouter, createWebHistory } from 'vue-router'
import HistoryView from '../views/HistoryView.vue'
import HistoryDetailView from '../views/HistoryDetailView.vue'
import RecordView from '../views/RecordView.vue'
import StatisticsView from '../views/StatisticsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/record' },
    { path: '/record', component: RecordView },
    { path: '/history', component: HistoryView },
    { path: '/history/:date', component: HistoryDetailView },
    { path: '/statistics', component: StatisticsView },
    { path: '/:pathMatch(.*)*', redirect: '/record' },
  ],
})

export default router
