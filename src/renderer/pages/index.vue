<template>
  <div class="card col-12 col-sm-10 col-md-8 col-xl-6 mx-auto mt-3">
    <div class="card-body">
      <h5 class="card-title">Connect to server</h5>
      <div class="card-text">
        <form @submit.prevent class="form">
          <div class="form-group"></div>
          <button
            class="btn btn-primary"
            type="submit"
            @click="$router.push('/chat')"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { remote } from "electron";
import Vue from "vue";
import _ from "@nuxt/types";
export default Vue.extend({
  data() {
    return {
      externalContent: ""
    };
  },
  methods: {
    openURL(url) {
      remote.remote.shell.openExternal(url);
    },
    openChat(server: string, nick: string, user: string, host: string, realname: string) {
      (this as Vue).$router
    }
  }
});
</script>

<style lang="scss"></style>
