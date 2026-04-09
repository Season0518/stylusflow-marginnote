// PanGate 常量：默认值、范围、存储 key
// 依赖 ShortcutConstants（FLAGS.OPTION）
const PanGateConstants = Object.freeze({
  STORAGE_KEY:           'stylusflow.pangate.config.v1',
  DEFAULT_EXPIRED_MS:    800,
  MIN_EXPIRED_MS:        10,
  MAX_EXPIRED_MS:        5000,
  STEP:                  100,
  DEFAULT_TRIGGER_INPUT: ' ',
  DEFAULT_TRIGGER_FLAGS: 0,
  DEFAULT_STOP_FLAGS:    ShortcutConstants.FLAGS.OPTION,
  QUERY_RESULT:          Object.freeze({ checked: false, disabled: false }),
});
