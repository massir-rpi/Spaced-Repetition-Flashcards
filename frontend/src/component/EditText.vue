<template>
  <div>
    <div v-if="!isEditing" @click="editText">{{ editableText }}</div>
      <textarea v-else-if="inputType === 'textarea'"
        v-model="editableText"
        @keydown.enter="saveText"
        @blur="saveText" />
      <input v-else
        v-model="editableText"
        @keydown.enter="saveText"
        @blur="saveText" />
  </div>
</template>

<script>
export default {
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    onSave: {
      type: Function,
      required: true,
    },
    inputType: {
      type: String,
      default: 'input',
      validator: function(value) {
        return ['input', 'textarea'].indexOf(value) !== -1; // Only allow 'input' or 'textarea'
      },
    },
  },
  data() {
    return {
      editableText: this.modelValue,
      isEditing: false,
    };
  },
  methods: {
    editText() {
      this.isEditing = true; // Switch to editing mode
    },
    saveText() {
      this.onSave(this.editableText); // Call the onSave function with the new text
      this.$emit('input', this.editableText); // Emit the updated value for v-model
      this.isEditing = false; // Exit editing mode
    },
  },
  watch: {
    value(newValue) {
      this.editableText = newValue; // Update editableText if the prop changes
    },
  },
};
</script>