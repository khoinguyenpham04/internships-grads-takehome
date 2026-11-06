<template>
  <footer class="deck-footer">
    <span class="name">Noah Pham</span>
    <span class="brand">
      <img src="/icons/incident.svg" alt="" />
      incident.io take-home
    </span>
  </footer>
</template>

<style scoped>
.deck-footer {
  position: absolute;
  left: 44px;
  right: 44px;
  bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: #a1a1aa;
  pointer-events: none;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand img {
  height: 11px;
}
</style>
