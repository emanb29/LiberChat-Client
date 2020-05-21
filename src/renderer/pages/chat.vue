<template>
  <div class="chat h-100 px-0 d-flex flex-column mx-auto">
    <div class="px-0 flex-grow-1 d-flex flex-wrap align-items-stretch">
      <select
        class="form-control col-2 w-100 h-100"
        v-model="selectedChans"
        multiple
        @change="selectedUsers = []"
      >
        <option value="#a-channel">#a-channel</option>
        <option value="#other">#other</option>
      </select>
      <div class="col-8 border rounded" style="overflow-y: scroll;">
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
        <option value="erin">erin</option>
        <option value="ethan">ethan</option>
      </select>
    </div>
    <div class="input-group px-0">
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
.chat {
  div {
    max-height: 80vh;
  }
}
</style>
