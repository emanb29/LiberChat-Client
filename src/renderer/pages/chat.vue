<template>
  <div class="chat">
    Chat will be here!
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import process from 'process'
import { remote } from "electron";
export default Vue.extend({
  asyncData(ctx) {
    console.log(ctx)
  },
  props: {

  }
});
</script>

<style></style>
