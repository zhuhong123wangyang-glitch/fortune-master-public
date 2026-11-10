// Fortune Master V1.2: fail closed for calendar ambiguity; never infer time zone from OS.
import {interpretResult} from '../interpretation/explain.mjs';
export const SCHEMA_VERSION = '1.4.0';
export const DISCLAIMER = '传统术数文化研究与娱乐参考，不是科学预测；不构成医疗、财务、法律、婚姻或其他重大决策依据。';
export function assertPlainDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日期格式必须为 YYYY-MM-DD');
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 2099 || m < 1 || m > 12 || d < 1 || d > 31) throw new Error('日期超出 V1.2 支持范围（1900–2099）');
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) throw new Error('日期无效');
  return { y, m, d, iso: value };
}
export function assertClock(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('时间格式必须为 HH:mm（24 小时制）');
  const [h, min] = value.split(':').map(Number);
  return { h, min };
}
export function assertTimezone(timezone = 'Asia/Shanghai') {
  if (timezone !== 'Asia/Shanghai') throw new Error('V1.2 仅支持 Asia/Shanghai 的当地钟表时间；其他时区将在后续版本支持');
  return timezone;
}
export function assertGender(gender) {
  if (!['male', 'female'].includes(gender)) throw new Error('计算大运方向需要明确 gender=male 或 gender=female；V1.2 使用传统命理排运性别口径');
  return gender;
}
export function assertSect(value, label='sect') {
  const n = Number(value);
  if (!Number.isInteger(n) || ![1,2].includes(n)) throw new Error(`${label} 只能为 1 或 2`);
  return n;
}
export function standardResult(method, input, result, extras={}) {
  const base={
    schemaVersion: SCHEMA_VERSION,
    application: 'Fortune Master', version: '1.5.0', method, input,
    result, evidence: extras.evidence || [],
    policy: extras.policy || {},
    warnings: extras.warnings || [],
    disclaimer: DISCLAIMER
  };
  base.interpretation=interpretResult(base);
  return base;
}
