<template>
  <div class="chat h-100 px-0 d-flex flex-column mx-auto">
    <div class="chat-display px-0 flex-grow-1 d-flex flex-wrap">
      <select
        class="form-control col-2 w-100 h-100"
        v-model="selectedChans"
        multiple
        @change="selectedUsers = []"
      >
        <option v-for="(_, i) in Array(10)" :key="i" :value="'#a-channel-' + i">
          #a-channel-{{ i }}
        </option>
      </select>
      <div class="col-8 border rounded">
        <pre
          v-for="(_, i) in Array(40)"
          :key="i"
          class="m-0 border-bottom text-wrap"
          >{{ (i % 5) + 1 }}: This is message {{ i }}</pre
        >
      </div>
      <select
        class="form-control col-2 w-100 h-100"
        v-model="selectedUsers"
        @change="selectedChans = []"
        multiple
      >
        <option v-for="(_, i) in Array(100)" :key="i" :value="'user' + i">
          user{{ i }}
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
        <button class="btn btn-primary" type="submit">Send</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import process from "process";
import { remote } from "electron";
export default Vue.extend({
  asyncData(ctx) {
    return {
      ...ctx.query
    };
  },
  data() {
    return {
      selectedChans: [],
      selectedUsers: []
    };
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
