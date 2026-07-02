<script setup>
defineProps({
  modules: {
    type: Array,
    required: true,
  },
  selectedModules: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['select', 'unselect'])
</script>

<template>
  <section class="rounded-2xl bg-white/90 p-4 shadow-sm shadow-[#92A8D1]/20 ring-1 ring-white/80 backdrop-blur">
    <div class="mb-3">
      <h2 class="text-base font-semibold text-slate-950">今天学了哪些模块</h2>
      <p class="mt-1 text-xs text-slate-500">只选择今天实际学习过的模块，未填写内容不会保存。</p>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="module in modules"
        :key="module.key"
        type="button"
        class="rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-[0.98]"
        :class="
          selectedModules.includes(module.key)
            ? 'border-[#92A8D1] bg-[#F7CAC9]/35 text-[#4d5f8f] shadow-sm shadow-[#F7CAC9]/40'
            : 'border-[#dbe3f2] bg-[#f7f9fd] text-slate-700 hover:border-[#92A8D1] hover:bg-white'
        "
        @click="selectedModules.includes(module.key) ? emit('unselect', module.key) : emit('select', module.key)"
      >
        {{ module.label }}
      </button>
    </div>
  </section>
</template>
