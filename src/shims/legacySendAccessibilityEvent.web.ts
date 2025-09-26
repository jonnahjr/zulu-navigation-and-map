// No-op shim for legacySendAccessibilityEvent used by ReactNativePrivateInterface
// This function historically dispatched accessibility events on native platforms.
// For web, we provide a no-op to satisfy internal imports during development.
export default function legacySendAccessibilityEvent() {
  // no-op
}
