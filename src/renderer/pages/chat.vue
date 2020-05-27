<template>
  <div class="chat h-100 px-0 d-flex flex-column mx-auto">
    <form @submit.prevent.stop="doSend" onSubmit="return false;">
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
            v-for="(msg, i) in messages"
            :key="i"
            class="m-0 border-bottom text-wrap"
          >
          {{ msg }} 
        </pre
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
          v-model="message"
          placeholder="Enter your message"
          @keydown.enter.prevent="doSend"
        />
        <div class="input-group-append">
          <button
            id="send"
            class="btn btn-primary"
            type="submit"
            :disabled="!submittable"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import _ from "@nuxt/types";
import { BvToast } from "bootstrap-vue/src/components/toast";
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
      messages: [],
      message: ""
    };
  },
  computed: {
    submittable() {
      return !(
        this.selectedChans.length === 0 &&
        this.selectedUsers.length === 0 &&
        !this.message.startsWith("/")
      );
    }
  },
  methods: {
    joinEnteredChannel: () => {
      if (this.newChannel) {
        let newChannel = "#" + this.newChannel;
        // TODO actually join channel
        this.availableChans.push(newChannel);
      }

      this.newChannel = "";
    },
    runRawCommand(cmd: string) {
      if (!cmd.endsWith("\r\n")) cmd += "\r\n";
      ipcRenderer.send("irc-command-raw", cmd);
    },
    doSend() {
      if (!this.submittable) return;

      if (this.message.startsWith("/")) {
        const rawCmd = this.message.slice(1);
        this.runRawCommand(rawCmd);
        this.addMessage(`RAW COMMAND: ${rawCmd}`);
        this.message = "";
      } else {
        console.error("can't handle that yet!");
      }
    },
    addMessage(msg: string) {
      this.messages.unshift(msg);
    }
  },
  mounted() {
    // TODO register event handlers
    ipcRenderer.on("irc-message", (ev, msgStr: string) => {
      this.addMessage(msgStr);
    });
    ipcRenderer.on("irc-join", (ev, [user, channel]) => {
      this.addMessage(`JOIN ALERT: ${user} joined ${channel}`);
      this.availableUsers += [user];
    });
    ipcRenderer.on("irc-leave", (ev, leaveInfo) => {
      let user = leaveInfo[0];
      let channel = leaveInfo[1];
      let partMessage = leaveInfo.length > 2 ? leaveInfo[2] : "";
      this.addMessage(
        `LEAVE ALERT: ${user} parted ${channel} with message ${partMessage}`
      );
    });
  }
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
