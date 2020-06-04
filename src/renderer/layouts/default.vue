<template>
  <div class="h-100">
    <nuxt />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { BvToast } from "bootstrap-vue/src/components/toast";
import _ from "@nuxt/types";
import { ipcRenderer } from "electron";
export default Vue.extend({
  mounted() {
    // Display any errors, regardless of what page we're on.
    ipcRenderer
      .on("irc-error", (event, data) =>
        (this as Vue).$root.$bvToast.toast(data, {
          title: "IRC Error",
          toaster: "b-toaster-top-right",
          variant: "warning"
        })
      )
      .on("go-index", ev => {
        (this as Vue).$router.push({
          path: "/"
        });
      });
  }
});
</script>
<style>
*,
*:before,
*:after {
  box-sizing: border-box;
  margin: 0;
}

html,
body {
  height: 100%;
  margin: 0 !important;
}

div#__nuxt,
#__layout,
#__layout > div,
#app {
  height: 100%;
}
</style>
