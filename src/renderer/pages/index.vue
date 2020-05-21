<template>
  <div class="container pt-5">
    <div class="card col-12 col-sm-10 col-md-8 col-xl-6 mx-auto">
      <div class="card-body">
        <h5 class="card-title">Connect to server</h5>
        <div class="card-text">
          <form @submit.prevent class="form">
            <div class="form-group">
              <label for="server">Server</label>
              <input
                type="text"
                id="server"
                v-model="server"
                class="form-control"
                name="server"
              />
            </div>
            <div class="form-group">
              <label for="nick">Nick</label>
              <input
                type="text"
                id="nick"
                v-model="nick"
                class="form-control"
                name="nick"
              />
            </div>
            <div class="form-group">
              <label for="user">Username</label>
              <input
                type="text"
                id="user"
                v-model="user"
                class="form-control"
                name="user"
              />
            </div>
            <div class="form-group">
              <label for="host">Hostname</label>
              <input
                type="text"
                id="host"
                v-model="host"
                class="form-control"
                name="host"
              />
            </div>
            <div class="form-group">
              <label for="realname">Real Name</label>
              <input
                type="text"
                id="realname"
                v-model="realname"
                class="form-control"
                name="realname"
              />
            </div>
            <button
              class="btn btn-primary"
              type="submit"
              @click="openChat(server, nick, user, host, realname)"
            >
              Join
            </button>
          </form>
        </div>
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
      externalContent: "",
      server: null,
      nick: null,
      user: null,
      host: null,
      realname: null
    };
  },
  methods: {
    openURL(url) {
      remote.remote.shell.openExternal(url);
    },
    openChat(
      server: string | null,
      nick: string | null,
      user: string | null,
      host: string | null,
      realname: string | null
    ) {
      if (server && nick && user && host && realname) {
        (this as Vue).$router.push({
          path: "/chat",
          query: {
            server,
            nick,
            user,
            host,
            realname
          }
        });
      }
    }
  }
});
</script>

<style lang="scss"></style>
