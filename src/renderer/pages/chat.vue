<template>
  <div class="chat h-100 px-0 d-flex flex-column mx-auto">
    <div class="chat-display px-0 flex-grow-1 d-flex flex-wrap">
      <div class="channels col-3 p-0 d-flex flex-column">
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">#</span>
          </div>
          <input
            type="text"
            class="form-control"
            name="newChannel"
            v-model="newChannel"
          />
          <div class="input-group-append">
            <button class="btn btn-secondary" @click="joinEnteredChannel()">
              +
            </button>
          </div>
        </div>
        <select
          class="form-control w-100 flex-grow-1"
          v-model="selectedChans"
          multiple
          @change="selectedUsers = []"
        >
          <option v-for="(chan, i) in availableChans" :key="i" :value="chan">
            {{ chan }}
          </option>
        </select>
      </div>
      <div class="col-7 border rounded">
        <pre
          v-for="(_, i) in Array(40)"
          :key="i"
          class="m-0 border-bottom text-wrap"
          >{{ (i % 5) + 1 }}: This is message {{ i }}</pre
        >
      </div>
      <select
        class="form-control col-2 w-100"
        v-model="selectedUsers"
        @change="selectedChans = []"
        multiple
      >
        <option v-for="(user, i) in availableUsers" :key="i" :value="user">
          {{ user }}
        </option>
      </select>
    </div>
    <div class="chat-input input-group px-0">
      <input
        class="form-control"
        type="text"
        name="message"
        placeholder="Enter your message"
      />
      <div class="input-group-append">
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="selectedChans.length === 0 && selectedUsers.length === 0"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import process from "process";
import { remote, ipcRenderer } from "electron";
export default Vue.extend({
  asyncData(ctx) {
    return {
      ...ctx.query
    };
  },
  data() {
    return {
      newChannel: "",
      selectedChans: [],
      availableChans: ["#test"],
      selectedUsers: [],
      availableUsers: ["ethan", "erin"],
      messages: []
    };
  },
  methods: {
    joinEnteredChannel() {
      if (this.newChannel) {
        let newChannel = "#" + this.newChannel;
        // TODO actually join channel
        this.availableChans.push(newChannel);
      }

      this.newChannel = "";
    }
  },
  mounted() {
    ipcRenderer.on("ready", (event, data) => console.log(event, data));
  },
  props: {}
});
</script>

<style lang="scss">
@import "@/assets/scss/bootstrap_config.scss";

.chat {
  .chat-display > * {
    overflow-y: scroll;
    height: calc(100vh - #{$input-height});
  }
  .chat-input {
    height: $input-height;
  }
}
</style>
