export async function loadLunar() {
  try {
    const lib = await import('lunar-typescript');
    // ESM/CJS interop fallback.
    const root = lib.Solar ? lib : lib.default;
    if (!root?.Solar?.fromYmdHms || !root?.Solar?.fromYmd) throw new Error('未找到 Solar API');
    return root;
  } catch (error) {
    if (error.code==='ERR_MODULE_NOT_FOUND' || String(error).includes('Cannot find package'))
      throw new Error('缺少历法依赖 lunar-typescript。请进入项目目录执行 npm install --ignore-scripts（首次需联网），然后重试。');
    throw error;
  }
}
